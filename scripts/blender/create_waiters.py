"""Run in Blender. Builds original, rigged chibi waiters from the supplied reference."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'models'
SOURCE = ROOT / 'assets-source' / 'characters'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('Restaurant Waiters')
bpy.context.window.scene = scene
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 25

def material(name, hex_color, roughness=.7):
    rgb = [int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4)]
    rgb = [v / 12.92 if v < .04045 else ((v + .055) / 1.055)**2.4 for v in rgb]
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    node = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*rgb, 1)
    node.inputs['Roughness'].default_value = roughness
    return m

skin = material('Peach skin', 'F2A574')
ear = material('Warm ear and cheeks', 'E9916B')
hair = material('Espresso hair', '382820')
hair_light = material('Hair soft variation', '423027')
white = material('Ivory cotton', 'F0E9E0')
apron = material('Charcoal apron', '292A2C')
seam = material('Apron stitching', '3D3C3D')
pants = material('Black trousers', '242527')
shoe = material('Brown leather', '30251F', .45)
sole = material('Soles', '201D1B')
gold = material('Brass name badge', 'CBA56D', .4)
eye = material('Eyes', '211C19', .3)
mouth = material('Smile', 'B66F50')

def character(name, female=False):
    parts = []
    def finish(obj, label, mat, bone):
        obj.name = name + '_' + label
        obj.data.materials.append(mat)
        for f in obj.data.polygons: f.use_smooth = True
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
        parts.append(obj)
        return obj

    def oval(label, loc, scale, mat, bone='Head', rotation=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc)
        obj = bpy.context.object
        obj.scale = scale
        if rotation: obj.rotation_euler = rotation
        return finish(obj, label, mat, bone)

    def box(label, loc, scale, mat, bone='Spine', bevel=.035, rotation=None):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.object
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        mod = obj.modifiers.new('Soft tailoring', 'BEVEL')
        mod.width, mod.segments = bevel, 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        if rotation: obj.rotation_euler = rotation
        return finish(obj, label, mat, bone)

    def strand(label, points, radius, mat, bone='Head'):
        curve = bpy.data.curves.new(label, 'CURVE')
        curve.dimensions = '3D'
        curve.bevel_depth, curve.bevel_resolution = radius, 2
        spline = curve.splines.new('BEZIER')
        spline.bezier_points.add(len(points)-1)
        for p, co in zip(spline.bezier_points, points):
            p.co = co
            p.handle_left_type = p.handle_right_type = 'AUTO'
        obj = bpy.data.objects.new(label, curve)
        scene.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target='MESH')
        return finish(bpy.context.object, label, mat, bone)

    # Forward is -Y in Blender; GLB converts this to +Z, with Y up.
    box('Shirt', (0, 0, .77), (.36, .245, .40), white, bevel=.09)
    oval('Neck', (0, 0, 1.0), (.085, .08, .115), skin, 'Spine')
    box('Head', (0, -.015, 1.285), (.565, .455, .49), skin, 'Head', .17)
    oval('Hair back', (0, .055, 1.39), (.302, .237, .265), hair)
    for side in (-1, 1):
        suffix = 'L' if side == 1 else 'R'
        oval('Ear '+suffix, (side*.284, -.005, 1.245), (.057, .043, .078), skin)
        oval('Ear inset '+suffix, (side*.312, -.035, 1.25), (.022, .012, .039), ear)
        oval('Eye '+suffix, (side*.108, -.247, 1.29), (.027, .013, .052), eye)
        oval('Eye glint '+suffix, (side*.108-.006, -.259, 1.309), (.005, .003, .007), white)
        strand('Brow '+suffix, [(side*.075,-.239,1.377),(side*.11,-.245,1.389),(side*.141,-.23,1.379)], .012, hair)
        oval('Cheek '+suffix, (side*.177, -.229, 1.228), (.033,.006,.015), ear)
        box('Collar '+suffix, (side*.067,-.115,.969), (.085,.035,.112), white, rotation=(0,side*-.38,0), bevel=.013)
        box('Apron strap '+suffix, (side*.116,-.127,.898), (.044,.021,.19), apron, bevel=.009)
        oval('Upper sleeve '+suffix, (side*.218,0,.849), (.082,.097,.145), white, 'UpperArm.'+suffix, (0,side*-.19,0))
        box('Rolled cuff '+suffix, (side*.239,-.005,.753), (.15,.175,.064), white, 'UpperArm.'+suffix, bevel=.025)
        oval('Forearm '+suffix, (side*.255,-.003,.672), (.052,.058,.105), skin, 'Forearm.'+suffix)
        oval('Hand '+suffix, (side*.264,-.012,.592), (.057,.055,.075), skin, 'Hand.'+suffix)
        oval('Thumb '+suffix, (side*.227,-.046,.607), (.026,.03,.045), skin, 'Hand.'+suffix)
        box('Trouser thigh '+suffix, (side*.095,0,.424), (.155,.183,.25), pants, 'Thigh.'+suffix, .052)
        box('Trouser shin '+suffix, (side*.095,0,.242), (.144,.168,.22), pants, 'Shin.'+suffix, .036)
        box('Sole '+suffix, (side*.095,-.044,.04), (.17,.265,.054), sole, 'Foot.'+suffix, .024)
        oval('Shoe '+suffix, (side*.095,-.05,.09), (.086,.139,.064), shoe, 'Foot.'+suffix)
        strand('Shoe seam '+suffix, [(side*.095-.055,-.135,.103),(side*.095,-.15,.122),(side*.095+.055,-.135,.103)], .003, sole, 'Foot.'+suffix)
    oval('Nose', (0,-.255,1.235), (.025,.026,.025), skin)
    strand('Smile', [(-.027,-.245,1.184),(0,-.251,1.178),(.027,-.245,1.184)], .004, mouth)
    box('Apron bib', (0,-.132,.808), (.276,.03,.226), apron, bevel=.026)
    box('Apron skirt', (0,-.099,.566), (.365,.111,.303), apron, 'Hips', .036)
    box('Waist band', (0,-.008,.704), (.374,.269,.048), apron, 'Hips', .016)
    box('Pocket', (0,-.161,.575), (.177,.015,.116), seam, 'Hips', .025)
    box('Pocket face', (0,-.17,.579), (.16,.009,.099), apron, 'Hips', .022)
    box('Name badge', (.067,-.154,.862), (.068,.012,.028), gold, bevel=.005)
    for side in (-1,1):
        oval('Bow loop', (side*.047,.148,.696), (.058,.023,.028), apron, 'Hips', (0,side*.3,0))
        box('Bow ribbon', (side*.036,.142,.627), (.032,.022,.133), apron, 'Hips', .008, (0,side*-.22,0))
    oval('Bow knot', (0,.17,.697), (.026,.023,.025), seam, 'Hips')
    if female:
        oval('Bun', (0,.10,1.641), (.142,.123,.119), hair)
        for i in range(5):
            angle = i*math.tau/5
            oval('Bun coil', (.075*math.cos(angle),.10+.055*math.sin(angle),1.645), (.082,.085,.088), hair_light)
        oval('Swept fringe left', (-.108,-.157,1.453), (.171,.10,.107), hair_light, rotation=(0,-.55,-.15))
        oval('Swept fringe right', (.173,-.12,1.427), (.091,.105,.149), hair, rotation=(0,-.38,0))
        for s in (-1,1):
            oval('Side lock', (s*.247,-.064,1.19), (.025,.045,.13), hair, rotation=(0,s*.09,0))
            strand('Eyelash', [(s*.127,-.252,1.315),(s*.148,-.246,1.333)], .006, eye)
    else:
        for i,(x,z,sx,ang) in enumerate([(-.22,1.449,.095,-.4),(-.105,1.478,.129,-.45),(.025,1.493,.137,-.3),(.16,1.475,.12,.4)]):
            oval('Fringe '+str(i), (x,-.153,z), (sx,.115,.097), hair_light if i%2 else hair, rotation=(0,ang,0))
        for x,y,z,ang in [(-.12,.01,1.606,-.2),(.055,.04,1.626,.3),(.20,.02,1.56,.5)]:
            oval('Crown tuft',(x,y,z),(.106,.115,.064),hair,rotation=(0,ang,0))
        for s in (-1,1):
            oval('Sideburn',(s*.253,-.02,1.323),(.033,.073,.099),hair)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = name+'_Mesh'
    scene.cursor.location = (0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    rig_data = bpy.data.armatures.new(name+'_Skeleton')
    rig = bpy.data.objects.new(name, rig_data)
    scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(n, head, tail, parent=None):
        b = rig_data.edit_bones.new(n)
        b.head,b.tail = head,tail
        if parent: b.parent = rig_data.edit_bones[parent]
    bone('Root',(0,0,0),(0,0,.15))
    bone('Hips',(0,0,.52),(0,0,.7),'Root')
    bone('Spine',(0,0,.7),(0,0,1),'Hips')
    bone('Head',(0,0,1),(0,0,1.5),'Spine')
    for s in (-1,1):
        f = 'L' if s==1 else 'R'
        bone('UpperArm.'+f,(s*.18,0,.925),(s*.24,0,.75),'Spine')
        bone('Forearm.'+f,(s*.24,0,.75),(s*.26,0,.62),'UpperArm.'+f)
        bone('Hand.'+f,(s*.26,0,.62),(s*.26,0,.55),'Forearm.'+f)
        bone('Thigh.'+f,(s*.095,0,.52),(s*.095,0,.33),'Hips')
        bone('Shin.'+f,(s*.095,0,.33),(s*.095,0,.12),'Thigh.'+f)
        bone('Foot.'+f,(s*.095,0,.12),(s*.095,-.15,.07),'Shin.'+f)
    bpy.ops.object.mode_set(mode='OBJECT')
    mesh.parent = rig
    mod = mesh.modifiers.new('Deform', 'ARMATURE')
    mod.object = rig
    rig.show_in_front = True
    rig.animation_data_create()
    for clip in ('Idle','Walk'):
        action = bpy.data.actions.new(name+'_'+clip)
        rig.animation_data.action = action
        for frame in range(1,26):
            phase = (frame-1)/24*math.tau
            for pb in rig.pose.bones:
                pb.rotation_mode = 'XYZ'
                pb.rotation_euler = (0,0,0)
                pb.location = (0,0,0)
            rig.pose.bones['Hips'].location.y = .006*math.sin(phase) if clip=='Idle' else .018*(1-math.cos(2*phase))
            rig.pose.bones['Head'].rotation_euler.z = .018*math.sin(phase)
            if clip=='Walk':
                for s in (-1,1):
                    f = 'L' if s==1 else 'R'
                    swing = math.sin(phase)*s
                    rig.pose.bones['Thigh.'+f].rotation_euler.x = .48*swing
                    rig.pose.bones['Shin.'+f].rotation_euler.x = -.5*max(0,-swing)
                    rig.pose.bones['Foot.'+f].rotation_euler.x = -.12*swing
                    rig.pose.bones['UpperArm.'+f].rotation_euler.x = -.32*swing
                    rig.pose.bones['Forearm.'+f].rotation_euler.x = -.12-.12*max(0,swing)
                rig.pose.bones['Spine'].rotation_euler.y = .04*math.sin(phase)
            for pb in rig.pose.bones:
                pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
                pb.keyframe_insert('location',frame=frame,group=pb.name)
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        track.strips.new(clip,1,action)
        track.mute = True
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_euler = (0,0,0)
        pb.location = (0,0,0)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    mesh.select_set(True)
    for track in rig.animation_data.nla_tracks: track.mute = False
    bpy.ops.export_scene.gltf(filepath=str(OUT/('waiter-female.glb' if female else 'waiter-male.glb')),
        use_selection=True, use_active_scene=True, export_format='GLB', export_animations=True,
        export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_anim_slide_to_zero=True)
    for track in rig.animation_data.nla_tracks: track.mute = True
    print(name, 'vertices',len(mesh.data.vertices),'bones',len(rig_data.bones))
    return rig

male = character('Waiter_Male')
female = character('Waiter_Female',True)
male.location.x = -.49
female.location.x = .49
scene.frame_set(1)

# Studio preview kept in the source .blend; never exported with the characters.
floor = material('Studio floor','39454D')
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.name = 'Studio floor'
bpy.context.object.data.materials.append(floor)
world = bpy.data.worlds.new('Studio world')
world.use_nodes = True
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value = (.18,.18,.18,1)
scene.world = world
for loc,power,size in [((-3,-4,6),650,4),((3,-1,4),450,3),((0,3,4),700,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    obj=bpy.context.object
    obj.data.energy,obj.data.shape,obj.data.size=power,'DISK',size
    obj.rotation_euler = (Vector((0,0,.8))-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.3,-7,2.5))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,0,.86))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=2.75
scene.camera=camera
scene.render.resolution_x=1200
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(SOURCE/'waiters-preview.png')
for rig in (male, female):
    for track in rig.animation_data.nla_tracks: track.mute = track.name != 'Walk'
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'restaurant-waiters.blend'))
print('Saved rigged characters and GLB exports:', OUT)
