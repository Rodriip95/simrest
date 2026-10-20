"""Run in Blender: rounded restaurant furniture, in metres, matching our chibi cast."""
import bpy
import math
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets-source' / 'furniture'
OUT = ROOT / 'public' / 'models' / 'furniture'
SOURCE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('Restaurant Furniture')
bpy.context.window.scene = scene

def material(name, color, roughness=.7):
    rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    m.diffuse_color=(*rgb,1)
    shader=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value=(*rgb,1)
    shader.inputs['Roughness'].default_value=roughness
    return m

oak=material('Honey oak','B88653')
top=material('Warm oak tabletop','D7AC75')
edge=material('Oak edge detail','C39865')
dark=material('Foot pads','4B4037')
sage=material('Sage upholstery','819E89')
coral=material('Terracotta upholstery','BD7968')
cream=material('Cream upholstery','E2D3B7')
parts=[]

def finish(o,name,m,bevel):
    o.name=name
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft edges','BEVEL')
        mod.width=bevel
        mod.segments=4
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in o.data.polygons: poly.use_smooth=True
    normals=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    normals.keep_sharp=True
    bpy.ops.object.modifier_apply(modifier=normals.name)
    o.data.materials.append(m)
    parts.append(o)
    return o

def box(name,loc,size,m,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object
    o.scale=size
    return finish(o,name,m,bevel)

def cylinder(name,loc,radius,depth,m,bevel=.015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=radius,depth=depth,location=loc)
    return finish(bpy.context.object,name,m,bevel)

def leg(name,a,b,radius=.037):
    delta=Vector(b)-Vector(a)
    o=cylinder(name,(Vector(a)+Vector(b))/2,radius,delta.length,oak,.012)
    o.rotation_euler=delta.to_track_quat('Z','Y').to_euler()

def join(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=name
    scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    parts.clear()
    return obj

def table(round_top):
    if round_top:
        cylinder('Rounded tabletop',(0,0,.715),.5,.07,top,.025)
        cylinder('Lower edge',(0,0,.671),.466,.03,edge,.012)
    else:
        box('Rounded tabletop',(0,0,.715),(1,1,.07),top,.035)
        box('Lower edge',(0,0,.671),(.925,.925,.03),edge,.014)
    for x in (-1,1):
        for y in (-1,1):
            radius=.275 if round_top else .34
            leg('Splayed table leg',(x*(radius+.035),y*(radius+.035),.022),(x*radius,y*radius,.668),.044)
    # Apron rails under the tabletop, kept away from seated knees.
    span=.55 if round_top else .68
    for s in (-1,1):
        box('Apron rail X',(0,s*span/2,.625),(span,.045,.075),oak,.014)
        box('Apron rail Y',(s*span/2,0,.625),(.045,span,.075),oak,.014)
    return join('table-round' if round_top else 'table-square')

def chair(color,name):
    # Faces -Y, backrest +Y in Blender; GLB faces +Z.
    box('Seat frame',(0,0,.405),(.44,.44,.075),oak,.035)
    box('Seat cushion',(0,-.012,.456),(.405,.395,.065),color,.03)
    for x in (-1,1):
        for y in (-1,1):
            leg('Chair leg',(x*.183,y*.183,.02),(x*.155,y*.155,.4),.026)
    for x in (-1,1):
        leg('Back upright',(x*.155,.16,.402),(x*.155,.205,.83),.024)
    back=box('Rounded back frame',(0,.205,.735),(.43,.065,.29),oak,.032)
    back.rotation_euler.x=-.10
    pad=box('Back cushion',(0,.165,.742),(.365,.035,.224),color,.017)
    pad.rotation_euler.x=-.10
    for x in (-1,1):
        leg('Side stretcher',(x*.17,-.16,.21),(x*.17,.16,.21),.015)
    return join(name)

tables=[table(False),table(True)]
chairs=[chair(sage,'chair-sage'),chair(coral,'chair-terracotta'),chair(cream,'chair-cream')]
assets=tables+chairs
manifest=[]

def export(name,objects,seats=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(p) for o in objects for p in o.bound_box]
    size=[round(max(p[i] for p in points)-min(p[i] for p in points),4) for i in range(3)]
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),use_selection=True,use_active_scene=True,
        export_format='GLB',export_animations=False)
    record=dict(id=name,model=name+'.glb',sizeXYZ=[size[0],size[2],size[1]],units='metres')
    if seats: record['seats']=seats
    manifest.append(record)

for obj in assets: export(obj.name,[obj])

def dining_set(table_obj,chair_obj,count,name):
    members=[]
    t=table_obj.copy()
    t.name=name+' table'
    scene.collection.objects.link(t)
    members.append(t)
    seats=[]
    for i in range(count):
        angle=i*math.tau/count
        x,y=.72*math.sin(angle),.72*math.cos(angle)
        c=chair_obj.copy()
        scene.collection.objects.link(c)
        c.name=name+' chair '+str(i+1)
        c.location=(x,y,0)
        c.rotation_euler.z=-angle
        members.append(c)
        seats.append(dict(position=[round(x,4),.489,round(-y,4)],rotationY=round(-angle,4)))
    export(name,members,seats)
    return members

square=dining_set(tables[0],chairs[0],4,'dining-square-four')
round_set=dining_set(tables[1],chairs[1],2,'dining-round-two')
# Presentation: two assembled settings and three standalone upholstery options.
for o in square: o.location.x-=1.15; o.location.y+=.5
for o in round_set: o.location.x+=1.15; o.location.y+=.5
for i,o in enumerate(chairs): o.location=((i-1)*.7,-1.25,0)
for o in tables: o.hide_render=True; o.hide_set(True)
floor=material('Studio floor','414D55')
box('Studio',(0,0,-.08),(200,200,.1),floor,.0)
world=bpy.data.worlds.new('Furniture studio world')
world.use_nodes=True
next(n for n in world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.18,.18,.18,1)
scene.world=world
for loc,power,size in [((-3,-4,6),1000,5),((4,-1,4),650,4),((0,4,5),900,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object
    o.data.energy=power
    o.data.size=size
    o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3,-6,5))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,.35))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=5.6
scene.camera=camera
scene.render.resolution_x=1500
scene.render.resolution_y=1150
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(SOURCE/'furniture-preview.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D': area.spaces.active.region_3d.view_perspective='CAMERA'
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'restaurant-furniture.blend'))
bpy.ops.render.render(write_still=True)
print('Saved',len(manifest),'furniture assets')
