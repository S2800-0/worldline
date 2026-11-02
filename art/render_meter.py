# Renders one nixie tube per digit. Run with:
#   Blender --background --python art/render_meter.py -- art/out
import math
import os
import sys

import bpy

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "art/out"
ONLY = sys.argv[sys.argv.index("--") + 2:] if "--" in sys.argv else []
WIDTH, HEIGHT = 360, 760
SAMPLES = 72

# Real tubes stack cathodes in a scrambled order so each digit sits at its own depth.
STACK = ["1", "6", "2", "7", "5", "0", "4", "9", "8", "3"]


def arc(cx, cz, rx, rz, a0, a1, n=48):
    pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append((cx + rx * math.cos(a), cz + rz * math.sin(a)))
    return pts


def six():
    return [arc(0.55, -0.38, 1.15, 1.48, 110, 180, 24) + arc(0, -0.48, 0.6, 0.62, 180, -180, 72)]


def nine():
    return [[(-x, -z) for x, z in stroke] for stroke in six()]


def glyph(d):
    if d == "0":
        return [arc(0, 0, 0.62, 1.1, 0, 360, 96)]
    if d == "1":
        return [[(-0.24, 0.76), (0.02, 1.1), (0.02, -1.1)]]
    if d == "2":
        return [arc(0, 0.52, 0.58, 0.58, 170, -32, 48) + [(-0.62, -1.1), (0.64, -1.1)]]
    if d == "3":
        return [arc(0, 0.58, 0.54, 0.52, 150, -90, 40) + arc(0, -0.5, 0.62, 0.6, 90, -160, 44)]
    if d == "4":
        return [[(0.28, -1.1), (0.28, 1.1), (-0.64, -0.38), (0.68, -0.38)]]
    if d == "5":
        return [[(0.52, 1.1), (-0.42, 1.1)] + arc(0, -0.42, 0.62, 0.68, 130, -165, 44)]
    if d == "6":
        return six()
    if d == "7":
        return [[(-0.62, 1.1), (0.62, 1.1), (-0.18, -1.1)]]
    if d == "8":
        return [arc(0, 0.58, 0.5, 0.52, 0, 360, 56), arc(0, -0.5, 0.62, 0.6, 0, 360, 64)]
    if d == "9":
        return nine()
    raise ValueError(d)


def wire(name, strokes, y, radius, material, detail=3):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = detail
    for stroke in strokes:
        spline = curve.splines.new("POLY")
        spline.points.add(len(stroke) - 1)
        for p, (x, z) in zip(spline.points, stroke):
            p.co = (x, y, z, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(material)
    return obj


def lathe(name, profile, material, segments=96):
    verts, faces = [], []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        for r, z in profile:
            verts.append((r * math.cos(a), r * math.sin(a), z))
    n = len(profile)
    for i in range(segments):
        for j in range(n - 1):
            a = i * n + j
            b = ((i + 1) % segments) * n + j
            faces.append((a, b, b + 1, a + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material)
    return obj


def node_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    return mat, nodes, mat.node_tree.links, out


def metal(name, color, roughness):
    mat, nodes, links, out = node_material(name)
    bsdf = nodes.new("ShaderNodeBsdfGlossy")
    bsdf.inputs["Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    links.new(bsdf.outputs[0], out.inputs[0])
    return mat


def diffuse(name, color, roughness=0.5):
    mat, nodes, links, out = node_material(name)
    bsdf = nodes.new("ShaderNodeBsdfDiffuse")
    bsdf.inputs["Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    links.new(bsdf.outputs[0], out.inputs[0])
    return mat


def emission(name, color, strength):
    mat, nodes, links, out = node_material(name)
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    links.new(em.outputs[0], out.inputs[0])
    return mat


def thin_glass(name):
    # A thin shell barely refracts, so transparent + Fresnel gloss reads truer than solid glass.
    mat, nodes, links, out = node_material(name)
    trans = nodes.new("ShaderNodeBsdfTransparent")
    trans.inputs["Color"].default_value = (0.97, 0.95, 0.92, 1)
    gloss = nodes.new("ShaderNodeBsdfGlossy")
    gloss.inputs["Color"].default_value = (1, 1, 1, 1)
    gloss.inputs["Roughness"].default_value = 0.03
    fresnel = nodes.new("ShaderNodeFresnel")
    fresnel.inputs["IOR"].default_value = 1.5
    mix = nodes.new("ShaderNodeMixShader")
    links.new(fresnel.outputs[0], mix.inputs[0])
    links.new(trans.outputs[0], mix.inputs[1])
    links.new(gloss.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], out.inputs[0])
    return mat


def hex_mesh(y, half_w, half_h, size, material):
    # Anode grid in front of the digits: the honeycomb that gives a real tube its texture.
    strokes = []
    dx = 1.5 * size
    dz = math.sqrt(3) * size
    col = -int(half_w / dx) - 1
    while col * dx <= half_w + dx:
        row = -int(half_h / dz) - 1
        while row * dz <= half_h + dz:
            cx = col * dx
            cz = row * dz + (dz / 2 if col % 2 else 0)
            ring = [
                (cx + size * math.cos(math.radians(60 * i)), cz + size * math.sin(math.radians(60 * i)))
                for i in range(7)
            ]
            if all(abs(x) <= half_w and abs(z) <= half_h for x, z in ring):
                strokes.append(ring)
            row += 1
        col += 1
    return wire("anode", strokes, y, 0.0042, material, detail=1)


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = "GPU"
    except Exception as exc:
        print("GPU unavailable, using CPU:", exc)
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 10
    scene.cycles.transparent_max_bounces = 24
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"

    world = bpy.data.worlds.new("black")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)
    scene.world = world

    glass = thin_glass("glass")
    steel = metal("steel", (0.055, 0.052, 0.05), 0.55)
    grid = metal("grid", (0.2, 0.19, 0.18), 0.5)
    mica = diffuse("mica", (0.2, 0.18, 0.15))
    bakelite = metal("bakelite", (0.035, 0.03, 0.026), 0.34)

    # Envelope: straight wall, domed top, small sealing tip.
    dome = [(math.cos(math.radians(a)) * 1.0, 1.72 + math.sin(math.radians(a)) * 0.62) for a in range(0, 86, 5)]
    lathe("envelope", [(1.0, -2.1)] + dome + [(0.05, 2.36), (0.02, 2.42), (0.0, 2.43)], glass)
    lathe("base", [(0.0, -2.75), (1.05, -2.75), (1.05, -2.1), (0.98, -2.02), (0.0, -2.02)], bakelite)

    # Internal structure, all of it lit only by the glowing digit and the reflections.
    for z in (-1.52, 1.52):
        lathe("spacer", [(0.0, z), (0.9, z), (0.9, z + 0.03), (0.0, z + 0.03)], mica)
    for x, y in ((-0.78, 0.0), (0.78, 0.0)):
        wire("rod", [[(x, -1.52), (x, 1.52)]], y, 0.018, steel)
    hex_mesh(-0.56, 0.74, 1.42, 0.04, grid)

    bpy.ops.object.camera_add(location=(0, -24, -0.16), rotation=(math.radians(90), 0, 0))
    camera = bpy.context.object
    camera.data.lens = 85
    camera.data.sensor_width = 36
    camera.data.sensor_fit = "VERTICAL"
    camera.data.sensor_height = 20
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 23.9
    camera.data.dof.aperture_fstop = 16
    scene.camera = camera
    return scene, steel


def cathode_depth(d):
    return -0.27 + 0.06 * STACK.index(d)


def add_digits(lit, steel, neon):
    for d in STACK:
        material = neon if d == lit else steel
        wire(f"digit_{d}", glyph(d), cathode_depth(d), 0.042 if d == lit else 0.011, material)


def clear_digits():
    for obj in list(bpy.data.objects):
        if obj.name.startswith(("digit_", "dot")):
            curve = obj.data
            bpy.data.objects.remove(obj)
            if curve and curve.users == 0:
                bpy.data.curves.remove(curve)


def main():
    os.makedirs(OUT, exist_ok=True)
    scene, steel = build_scene()
    neon = emission("neon", (1.0, 0.17, 0.014), 2.4)
    frames = ONLY or list("0123456789") + ["off", "dp"]
    for frame in frames:
        clear_digits()
        if frame == "dp":
            add_digits(None, steel, neon)
            dot = arc(0, -1.02, 0.07, 0.07, 0, 360, 24)
            wire("dot", [dot], -0.33, 0.04, neon)
        else:
            add_digits(None if frame == "off" else frame, steel, neon)
        scene.render.filepath = os.path.join(os.path.abspath(OUT), f"{frame}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", frame)


main()
