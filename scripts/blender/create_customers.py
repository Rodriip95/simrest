"""Run in Blender: derives six civilian characters from our editable waiter assets."""
import bpy
import bmesh
import math
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets-source' / 'characters'
OUT = ROOT / 'public' / 'models' / 'customers'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('Restaurant Customers')
bpy.context.window.scene = scene
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 25

def mat(name, color):
    rgb = [int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb = [v/12.92 if v < .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*rgb,1)
    node = next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*rgb,1)
    node.inputs['Roughness'].default_value = .72
    return m

variants = [
    dict(id='man-polo',female=False,skin='D49465',cheek='C17D58',hair='30251F',style='quiff',top='387F76',bottom='C5AA83',shoes='F2E9D8',outfit='polo',label='Hombre / polo verde / jopo'),
    dict(id='man-denim',female=False,skin='815138',cheek='9C6245',hair='231C1A',style='curls',top='E9D9BB',bottom='333B49',shoes='B26F47',outfit='jacket',label='Hombre / chaqueta denim / rizos'),
    dict(id='man-ochre',female=False,skin='F0BD97',cheek='DC9B7C',hair='A96832',style='part',top='C68C39',bottom='3D5364',shoes='644634',outfit='shirt',label='Hombre / camisa mostaza / raya lateral'),
    dict(id='woman-coral',female=True,skin='F1B38F',cheek='DC8E72',hair='6C3928',style='bob',top='CC7062',bottom='374E64',shoes='F1E3CF',outfit='shirt',label='Mujer / blusa coral / bob'),
    dict(id='woman-lilac',female=True,skin='89563D',cheek='AA6C50',hair='291E1B',style='curly-bob',top='A495BC',bottom='E0C9A4',shoes='EFE3D2',outfit='polo',label='Mujer / top lila / rizos'),
    dict(id='woman-sage',female=True,skin='C38D63',cheek='AE7253',hair='B47E3E',style='ponytail',top='ECE0C7',bottom='4B484A',shoes='A66B50',outfit='cardigan',label='Mujer / cardigan salvia / coleta'),
]

def make(v):
    # Append fresh data; do not mutate the waiters in the user's existing scene.
    base = 'Waiter_Female' if v['female'] else 'Waiter_Male'
    if Path(bpy.data.filepath).resolve() == (SOURCE/'restaurant-waiters.blend').resolve():
        rig=bpy.data.objects[base].copy()
        rig.data=rig.data.copy()
        mesh=bpy.data.objects[base+'_Mesh'].copy()
        mesh.data=mesh.data.copy()
        mesh.parent=rig
        for mod in mesh.modifiers:
            if mod.type=='ARMATURE': mod.object=rig
    else:
        with bpy.data.libraries.load(str(SOURCE/'restaurant-waiters.blend'), link=False) as (src,dst):
            dst.objects = [base,base+'_Mesh']
        rig = next(o for o in dst.objects if o.type=='ARMATURE')
        mesh = next(o for o in dst.objects if o.type=='MESH')
    for o in (rig,mesh): scene.collection.objects.link(o)
    rig.name = 'Customer_'+v['id']
    mesh.name = rig.name+'_Mesh'
    rig.location = (0,0,0)
    for track in rig.animation_data.nla_tracks: track.mute=True
    for pb in rig.pose.bones:
        pb.rotation_euler=(0,0,0)
        pb.location=(0,0,0)
    # Remove full hair material, including brows, to avoid cut surface fragments.
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    remove = []
    for face in bm.faces:
        name=mesh.data.materials[face.material_index].name
        uniform=any(s in name for s in ('Charcoal apron','Apron stitching','Brass name'))
        old_hair='hair' in name.lower()
        if uniform or old_hair: remove.append(face)
    bmesh.ops.delete(bm,geom=remove,context='FACES')
    loose=[vert for vert in bm.verts if not vert.link_faces]
    if loose: bmesh.ops.delete(bm,geom=loose,context='VERTS')
    bm.to_mesh(mesh.data)
    bm.free()
    colors={'Peach skin':v['skin'],'Warm ear':v['cheek'],'Espresso hair':v['hair'],
            'Hair soft':v['hair'],'Ivory cotton':v['top'],'Black trousers':v['bottom'],
            'Brown leather':v['shoes'],'Soles':'DED7CA','Smile':v['cheek']}
    for i,m in enumerate(mesh.data.materials):
        for prefix,color in colors.items():
            if m.name.startswith(prefix):
                mesh.data.materials[i]=mat(v['id']+' '+prefix,color)
                break
    hair=mat(v['id']+' hairstyle',v['hair'])
    pants=mat(v['id']+' waistband',v['bottom'])
    accent=mat(v['id']+' outerwear','476B88' if v['outfit']=='jacket' else '7E997E')
    trim=mat(v['id']+' trim','EEDFC5')
    parts=[]
    def shape(label,loc,scale,m,bone='Head',box=False,rot=0):
        bpy.ops.object.select_all(action='DESELECT')
        if box:
            bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
        else:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc)
        o=bpy.context.object
        o.name=v['id']+' '+label
        o.scale=scale
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        if box:
            mod=o.modifiers.new('Rounded edges','BEVEL')
            mod.width=.025
            mod.segments=3
            bpy.ops.object.modifier_apply(modifier=mod.name)
        o.rotation_euler.y=rot
        o.data.materials.append(m)
        for f in o.data.polygons: f.use_smooth=True
        group=o.vertex_groups.new(name=bone)
        group.add(list(range(len(o.data.vertices))),1,'REPLACE')
        parts.append(o)
    shape('Hip trousers',(0,0,.55),(.32,.205,.15),pants,'Hips',True)
    shape('Hair cap',(0,.055,1.426),(.303,.238,.227),hair)
    for s in (-1,1):
        shape('Eyebrow',(s*.108,-.24,1.382),(.04,.012,.013),hair,rot=s*.1)
    style=v['style']
    if style in ('curls','curly-bob'):
        for row in range(3):
            for i in range(10):
                angle=i*math.tau/10+row*.15
                radius=.245 if row<2 else .17
                shape('Curl',(radius*math.cos(angle),.035+radius*.77*math.sin(angle),1.43+row*.075),(.082,.079,.078),hair)
        if style=='curly-bob':
            for s in (-1,1):
                for i in range(4):
                    shape('Side curl',(s*(.255+.012*(i%2)),.025,1.14+i*.075),(.075,.12,.078),hair)
    elif style=='quiff':
        for i in range(4):
            shape('Quiff',(-.17+i*.103,-.13,1.50+i*.016),(.105,.126,.105),hair,rot=-.35)
    elif style=='part':
        shape('Side swept fringe',(-.08,-.16,1.482),(.20,.1,.094),hair,rot=-.2)
        shape('Parted fringe',(.204,-.13,1.454),(.078,.092,.108),hair,rot=.25)
    elif style=='bob':
        for s in (-1,1):
            shape('Bob side',(s*.25,.035,1.255),(.079,.16,.225),hair,rot=s*-.07)
        shape('Swept fringe',(-.08,-.16,1.46),(.199,.10,.109),hair,rot=-.35)
        shape('Small fringe',(.19,-.14,1.45),(.09,.09,.13),hair,rot=.3)
    elif style=='ponytail':
        shape('Ponytail',(0,.292,1.34),(.105,.11,.29),hair,rot=.15)
        shape('Hair tie',(0,.235,1.51),(.115,.045,.05),accent)
        shape('Swept fringe',(-.09,-.163,1.465),(.189,.10,.11),hair,rot=-.35)
        shape('Small fringe',(.19,-.13,1.448),(.09,.09,.13),hair,rot=.3)
    if v['outfit'] in ('jacket','cardigan'):
        for s in (-1,1):
            shape('Jacket panel',(s*.121,-.109,.779),(.119,.075,.365),accent,'Spine',True)
            shape('Lapel',(s*.085,-.157,.89),(.041,.024,.17),accent,'Spine',True,rot=s*.2)
            suffix='L' if s==1 else 'R'
            shape('Jacket sleeve',(s*.218,0,.849),(.085,.10,.148),accent,'UpperArm.'+suffix,rot=s*-.19)
        shape('Back panel',(0,.112,.77),(.36,.04,.35),accent,'Spine',True)
    if v['outfit']=='polo':
        shape('Placket',(0,-.13,.88),(.026,.016,.12),trim,'Spine',True)
        shape('Chest pocket',(.10,-.132,.81),(.075,.022,.074),trim,'Spine',True)
    else:
        for z in (.70,.78,.86):
            shape('Button',(0,-.134,z),(.009,.008,.009),trim,'Spine')
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active=mesh
    bpy.ops.object.join()
    # Store selection only: studio and other variants never enter the GLB.
    rig.select_set(True)
    for track in rig.animation_data.nla_tracks: track.mute=False
    bpy.ops.export_scene.gltf(filepath=str(OUT/(v['id']+'.glb')),use_selection=True,use_active_scene=True,
        export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',
        export_force_sampling=True,export_anim_slide_to_zero=True)
    for track in rig.animation_data.nla_tracks: track.mute=track.name!='Walk'
    print(v['id'],len(mesh.data.vertices),'vertices')
    return rig

rigs=[make(v) for v in variants]
for i,rig in enumerate(rigs): rig.location.x=(i-2.5)*.81
scene.frame_set(1)
floor=mat('Customer studio','424C54')
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.data.materials.append(floor)
world=bpy.data.worlds.new('Customer world')
world.use_nodes=True
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.18,.18,.18,1)
scene.world=world
for loc,power,size in [((-3,-4,6),1000,5),((4,-2,4),700,4),((0,3,4),900,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object
    o.data.energy=power
    o.data.size=size
    o.rotation_euler=(Vector((0,0,.8))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1,-10,3))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,.88))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=5.35
scene.camera=camera
scene.render.resolution_x=1800
scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(SOURCE/'customers-preview.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D': area.spaces.active.region_3d.view_perspective='CAMERA'
(OUT/'manifest.json').write_text(json.dumps([dict(id=v['id'],label=v['label'],model=v['id']+'.glb',animations=['Idle','Walk']) for v in variants],indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'restaurant-customers.blend'))
bpy.ops.render.render(write_still=True)
print('Saved six customers, GLB manifest and preview')
