# Renders the console's rotary dial from above. The body stays still so its
# highlights behave like real light; the page rotates only the pointer on top.
#   Blender --background --python art/render_dial.py -- art/out/dial.png
import math
import sys

import bpy

OUT = sys.argv[sys.argv.index("--") + 1]
SEGMENTS = 720
KNURLS = 72


def build_knob():
    profile = [
        (0.0, 0.50, 0.0),
        (0.70, 0.50, 0.0),
        (0.735, 0.492, 0.0),
        (0.76, 0.47, 0.0),
        (0.80, 0.46, 0.0),
        (0.83, 0.44, 0.35),
        (0.86, 0.40, 1.0),
        (0.86, 0.05, 1.0),
        (0.90, 0.02, 0.0),
        (0.96, 0.0, 0.0),
    ]
    verts, faces = [], []
    for i in range(SEGMENTS):
        a = 2 * math.pi * i / SEGMENTS
        ridge = abs(math.sin(KNURLS * a / 2)) ** 0.6
        for r, z, knurl in profile:
            radius = r + knurl * 0.028 * ridge
            verts.append((radius * math.cos(a), radius * math.sin(a), z))
    n = len(profile)
    for i in range(SEGMENTS):
        for j in range(n - 1):
            a = i * n + j
            b = ((i + 1) % SEGMENTS) * n + j
            faces.append((a, a + 1, b + 1, b))
    mesh = bpy.data.meshes.new("knob")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new("knob", mesh)
    bpy.context.collection.objects.link(obj)

    mat = bpy.data.materials.new("knob")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.028, 0.026, 0.024, 1)
    bsdf.inputs["Metallic"].default_value = 0.85
    bsdf.inputs["Roughness"].default_value = 0.34
    mesh.materials.append(mat)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for device in prefs.devices:
        device.use = True
    scene.cycles.device = "GPU"
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = 640
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("dim")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.018, 0.016, 0.014, 1)
    scene.world = world

    build_knob()

    for x, y, z, size, power, color in (
        (-2.4, 2.4, 3.0, 2.6, 60, (1.0, 0.95, 0.88)),
        (2.8, -0.8, 1.6, 0.8, 14, (1.0, 0.62, 0.34)),
    ):
        bpy.ops.object.light_add(type="AREA", location=(x, y, z))
        light = bpy.context.object
        light.data.size = size
        light.data.energy = power
        light.data.color = color
        light.rotation_euler = (
            math.atan2(math.hypot(x, y), z) * (1 if y < 0 else -1) * -1 if False else 0,
            0,
            0,
        )
        direction = light.location
        light.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()

    bpy.ops.object.camera_add(location=(0, 0, 6), rotation=(0, 0, 0))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.08
    scene.camera = camera

    scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)


main()
