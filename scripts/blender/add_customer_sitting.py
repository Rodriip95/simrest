"""Add a reusable static Sit clip to the customer GLBs and editable source."""
import bpy
import math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
scene=next(s for s in reversed(list(bpy.data.scenes)) if s.name.startswith('Restaurant Customers') and any(o.type=='ARMATURE' for o in s.objects))
bpy.context.window.scene=scene
for rig in [o for o in scene.objects if o.type=='ARMATURE']:
    name=rig.name.removeprefix('Customer_').split('.')[0]
    pos=rig.location.copy()
    rig.location=(0,0,0)
    for track in list(rig.animation_data.nla_tracks):
        if track.name=='Sit':rig.animation_data.nla_tracks.remove(track)
        else:track.mute=True
    action=bpy.data.actions.new(name+'_Sit')
    rig.animation_data.action=action
    for pb in rig.pose.bones:
        pb.rotation_mode='XYZ'
        pb.rotation_euler=(0,0,0)
        pb.location=(0,0,0)
    rig.pose.bones['Hips'].location.y=.055
    for side in ('L','R'):
        rig.pose.bones['Thigh.'+side].rotation_euler.x=-math.pi/2
        rig.pose.bones['Shin.'+side].rotation_euler.x=math.pi/2
        rig.pose.bones['UpperArm.'+side].rotation_euler.x=-.15
        rig.pose.bones['Forearm.'+side].rotation_euler.x=-1.0
    for frame in (1,25):
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_euler',frame=frame)
            pb.keyframe_insert('location',frame=frame)
    track=rig.animation_data.nla_tracks.new()
    track.name='Sit'
    track.strips.new('Sit',1,action)
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=False
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for child in rig.children:child.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/customers'/f'{name}.glb'),use_selection=True,use_active_scene=True,
        export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_anim_slide_to_zero=True)
    rig.location=pos
    for track in rig.animation_data.nla_tracks:track.mute=track.name!='Sit'
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets-source/characters/restaurant-customers.blend'))
print('Six Sit clips exported')
