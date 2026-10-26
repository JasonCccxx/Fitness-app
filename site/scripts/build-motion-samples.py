"""Bake original sample motions onto the CC0 MakeHuman rig distributed by OpenGym3D.

No Mixamo animation is retained. Geometry is reused; all clips below are original
kinematic approximations for visual review, not professionally reviewed tutorials.
"""
from pathlib import Path
import copy, hashlib, json, math, struct
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'site/source-assets/human-base.glb'
if not SOURCE.exists(): SOURCE = ROOT / '.local/push_up-cc0.glb'
OUTPUT = ROOT / 'site/backend/media'

def read_glb(path):
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from('<III', raw)
    assert magic == 0x46546c67 and version == 2 and total == len(raw)
    size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    return json.loads(raw[20:20+size]), raw[28+size:]

def accessor(doc, binary, index):
    a = doc['accessors'][index]; v = doc['bufferViews'][a['bufferView']]
    widths = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
    types = {5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
    return np.frombuffer(binary, dtype=types[a['componentType']],
        offset=v.get('byteOffset',0)+a.get('byteOffset',0),
        count=a['count']*widths[a['type']]).reshape(a['count'], widths[a['type']])

def rx(a):
    c,s = math.cos(a),math.sin(a)
    return np.array([[1,0,0],[0,c,-s],[0,s,c]])

def axis_rotation(axis,angle):
    x,y,z=unit(axis); c=math.cos(angle); s=math.sin(angle); t=1-c
    return np.array([[t*x*x+c,t*x*y-s*z,t*x*z+s*y],[t*x*y+s*z,t*y*y+c,t*y*z-s*x],[t*x*z-s*y,t*y*z+s*x,t*z*z+c]])

def unit(v):
    return np.array(v,dtype=float)/np.linalg.norm(v)

def align(a,b):
    a,b = unit(a),unit(b); v=np.cross(a,b); c=float(np.dot(a,b))
    if c > .999999: return np.eye(3)
    if c < -.999999:
        axis=unit(np.cross(a,[1,0,0] if abs(a[0])<.9 else [0,1,0]))
        return 2*np.outer(axis,axis)-np.eye(3)
    k=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]])
    return np.eye(3)+k+k@k/(1+c)

def quat(m):
    # Robust matrix -> xyzw, avoiding an extra scipy dependency.
    q=np.empty(4); t=np.trace(m)
    if t>0:
        s=math.sqrt(1+t)*2; q[:]=[(m[2,1]-m[1,2])/s,(m[0,2]-m[2,0])/s,(m[1,0]-m[0,1])/s,s/4]
    else:
        i=int(np.argmax(np.diag(m))); j=(i+1)%3; k=(i+2)%3
        s=math.sqrt(max(0,1+m[i,i]-m[j,j]-m[k,k]))*2
        q[i]=s/4; q[j]=(m[j,i]+m[i,j])/s; q[k]=(m[k,i]+m[i,k])/s; q[3]=(m[k,j]-m[j,k])/s
    return q/np.linalg.norm(q)

def ik(start,end,l1,l2,pole):
    delta=end-start; dist=float(np.linalg.norm(delta))
    if not abs(l1-l2)+.0001<dist<l1+l2-.0001:
        raise ValueError(f'Unreachable limb: {dist:.4f} not in {abs(l1-l2):.4f}..{l1+l2:.4f}')
    direction=delta/dist; side=unit(np.array(pole)-np.dot(pole,direction)*direction)
    along=(l1*l1-l2*l2+dist*dist)/(2*dist)
    return start+along*direction+math.sqrt(max(0,l1*l1-along*along))*side

doc, binary = read_glb(SOURCE)
skin=doc['skins'][0]; joints=skin['joints']; nodes=doc['nodes']
byname={n['name']:i for i,n in enumerate(nodes)}
parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
inverse=accessor(doc,binary,skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
bind={j:np.linalg.inv(m.astype(float)) for j,m in zip(joints,inverse)}
for m in bind.values():
    # Remove rounding-scale noise; bind transforms are rigid.
    u,_,v=np.linalg.svd(m[:3,:3]); m[:3,:3]=u@v

def descendants(name):
    result=[]
    def visit(i):
        if i in bind: result.append(i)
        for c in nodes[i].get('children',[]): visit(c)
    visit(byname[name]); return result

def pos(name): return bind[byname[name]][:3,3].copy()

def rigid(world, ids, rotation, origin, destination):
    for i in ids:
        world[i][:3,:3]=rotation@bind[i][:3,:3]
        world[i][:3,3]=destination+rotation@(bind[i][:3,3]-origin)

def segment(world,start,end,a,b):
    delta=align(pos(end)-pos(start),b-a)
    rigid(world,descendants(start),delta,pos(start),a)
    return delta

def pose(kind,phase):
    # A full, closed repetition with zero velocity at both ends.
    amount=(1-math.cos(2*math.pi*phase))/2
    world={i:m.copy() for i,m in bind.items()}
    if kind=='push-up':
        tilt=math.radians(72+12*amount); rotation=rx(tilt)
        pivot=(pos('foot.L')+pos('foot.R'))/2
        fixed=np.array([0,.125,-.80])
        rigid(world,joints,rotation,pivot,fixed)
        for suffix,sign in [('L',1),('R',-1)]:
            ankle=fixed+rotation@(pos('foot.'+suffix)-pivot)
            # Feet remain planted on the toes; the body pivots at the ankle.
            rigid(world,descendants('foot.'+suffix),rx(math.radians(48)),pos('foot.'+suffix),ankle)
            shoulder=world[byname['upperarm01.'+suffix]][:3,3].copy()
            wrist=np.array([sign*.30,.045,.48])
            l1=np.linalg.norm(pos('lowerarm01.'+suffix)-pos('upperarm01.'+suffix))
            l2=np.linalg.norm(pos('wrist.'+suffix)-pos('lowerarm01.'+suffix))
            elbow=ik(shoulder,wrist,l1,l2,[sign*.85,0,-.45])
            segment(world,'upperarm01.'+suffix,'lowerarm01.'+suffix,shoulder,elbow)
            segment(world,'lowerarm01.'+suffix,'wrist.'+suffix,elbow,wrist)
            # Build the hand frame from knuckles, then lay its palm plane flat.
            forward=unit(pos('finger3-3.'+suffix)-pos('wrist.'+suffix))
            across=pos('finger2-1.'+suffix)-pos('finger5-1.'+suffix)
            across=unit(across-np.dot(across,forward)*forward)
            restframe=np.column_stack([across,np.cross(forward,across),forward])
            newforward=np.array([0,0,1]); newacross=np.array([-sign,0,0])
            handframe=np.column_stack([newacross,np.cross(newforward,newacross),newforward])
            rigid(world,descendants('wrist.'+suffix),handframe@restframe.T,pos('wrist.'+suffix),wrist)
    else:
        offset=np.array([0,-.34*amount,-.18*amount]) if kind=='squat' else np.zeros(3)
        rigid(world,joints,np.eye(3),np.zeros(3),offset)
        lean=rx(math.radians(27*amount)) if kind=='squat' else np.eye(3)
        rigid(world,descendants('spine05'),lean,pos('spine05'),pos('spine05')+offset)
        for suffix,sign in [('L',1),('R',-1)]:
            if kind=='squat':
                hip=pos('upperleg01.'+suffix)+offset; ankle=pos('foot.'+suffix)
                l1=np.linalg.norm(pos('lowerleg01.'+suffix)-pos('upperleg01.'+suffix))
                l2=np.linalg.norm(pos('foot.'+suffix)-pos('lowerleg01.'+suffix))
                knee=ik(hip,ankle,l1,l2,[0,0,1])
                segment(world,'upperleg01.'+suffix,'lowerleg01.'+suffix,hip,knee)
                segment(world,'lowerleg01.'+suffix,'foot.'+suffix,knee,ankle)
                rigid(world,descendants('foot.'+suffix),np.eye(3),pos('foot.'+suffix),ankle)
            shoulder=world[byname['upperarm01.'+suffix]][:3,3].copy()
            l1=np.linalg.norm(pos('lowerarm01.'+suffix)-pos('upperarm01.'+suffix))
            l2=np.linalg.norm(pos('wrist.'+suffix)-pos('lowerarm01.'+suffix))
            if kind=='squat':
                elbow=shoulder+unit([sign*.08,-.20,1])*l1
                wrist=elbow+unit([0,.08,1])*l2
            else:
                elbow=shoulder+unit([sign*.08,-1,.025])*l1
                angle=math.radians(10+115*amount)
                wrist=elbow+unit([0,-math.cos(angle),math.sin(angle)])*l2
            segment(world,'upperarm01.'+suffix,'lowerarm01.'+suffix,shoulder,elbow)
            segment(world,'lowerarm01.'+suffix,'wrist.'+suffix,elbow,wrist)
    if kind=='dumbbell-curl':
        for suffix in ['L','R']:
            for finger in range(1,6):
                for joint,angle in [(1,60 if finger>1 else 25),(2,85 if finger>1 else 40),(3,55 if finger>1 else 30)]:
                    name=f'finger{finger}-{joint}.{suffix}'
                    index=byname[name]; pivot=world[index][:3,3].copy()
                    rotation=axis_rotation(world[index][:3,0],math.radians(angle))
                    for child in descendants(name):
                        world[child][:3,3]=pivot+rotation@(world[child][:3,3]-pivot)
                        world[child][:3,:3]=rotation@world[child][:3,:3]
    return world

def compact_geometry(source):
    target=copy.deepcopy(source); used=set()
    for mesh in target['meshes']:
        for p in mesh['primitives']:
            p['attributes'].pop('COLOR_0',None)  # no unvalidated muscle-activation claim
            used.update(p['attributes'].values())
            if 'indices' in p: used.add(p['indices'])
            for t in p.get('targets',[]): used.update(t.values())
    for s in target['skins']: used.add(s['inverseBindMatrices'])
    target['animations']=[]; target['accessors']=[]; target['bufferViews']=[]
    blob=bytearray(); mapping={}; viewmap={}
    for old in sorted(used):
        a=copy.deepcopy(source['accessors'][old]); view=a['bufferView']
        if view not in viewmap:
            v=copy.deepcopy(source['bufferViews'][view]); start=v.get('byteOffset',0)
            while len(blob)%4: blob.append(0)
            v['byteOffset']=len(blob); blob.extend(binary[start:start+v['byteLength']])
            viewmap[view]=len(target['bufferViews']); target['bufferViews'].append(v)
        a['bufferView']=viewmap[view]; mapping[old]=len(target['accessors']); target['accessors'].append(a)
    for mesh in target['meshes']:
        for p in mesh['primitives']:
            p['attributes']={k:mapping[v] for k,v in p['attributes'].items()}
            if 'indices' in p: p['indices']=mapping[p['indices']]
            for t in p.get('targets',[]):
                for k,v in t.items(): t[k]=mapping[v]
    for s in target['skins']: s['inverseBindMatrices']=mapping[s['inverseBindMatrices']]
    for i in joints:
        parent=parents.get(i); local=np.linalg.inv(bind[parent])@bind[i] if parent in bind else bind[i]
        target['nodes'][i].pop('matrix',None)
        target['nodes'][i].update(translation=local[:3,3].tolist(),rotation=quat(local[:3,:3]).tolist(),scale=[1,1,1])
    target['materials'][0]['pbrMetallicRoughness'].update(baseColorFactor=[.67,.72,.68,1],roughnessFactor=.68)
    target['asset']['generator']='JY FITNESS ATLAS motion sample baker / CC0 MakeHuman geometry via OpenGym3D'
    return target,blob

def add_accessor(target,blob,data,kind,limits=False):
    data=np.asarray(data,dtype='<f4'); width={'SCALAR':1,'VEC3':3,'VEC4':4}[kind]
    while len(blob)%4: blob.append(0)
    view=len(target['bufferViews']); payload=data.tobytes()
    target['bufferViews'].append({'buffer':0,'byteOffset':len(blob),'byteLength':len(payload)})
    blob.extend(payload); result=len(target['accessors'])
    a={'bufferView':view,'componentType':5126,'count':data.size//width,'type':kind}
    if limits: a.update(min=data.reshape(-1,width).min(axis=0).tolist(),max=data.reshape(-1,width).max(axis=0).tolist())
    target['accessors'].append(a); return result

def dumbbell(target,blob,suffix):
    # Three low-poly cylinders: metal grip plus two hexagonal plates, along X.
    vertices=[]; normals=[]; indices=[]
    for x0,x1,r,count in [(-.065,.065,.014,16),(-.115,-.065,.065,6),(.065,.115,.065,6)]:
        base=len(vertices)
        for x in [x0,x1]:
            for j in range(count):
                a=2*math.pi*j/count; vertices.append([x,r*math.cos(a),r*math.sin(a)]); normals.append([0,math.cos(a),math.sin(a)])
        for j in range(count):
            k=(j+1)%count
            indices.extend([base+j,base+k,base+count+j,base+k,base+count+k,base+count+j])
        for end,direction in [(0,-1),(1,1)]:
            center=len(vertices); vertices.append([x0 if end==0 else x1,0,0]); normals.append([direction,0,0])
            ring=len(vertices)
            for j in range(count):
                a=2*math.pi*j/count; vertices.append([x0 if end==0 else x1,r*math.cos(a),r*math.sin(a)]); normals.append([direction,0,0])
            for j in range(count):
                k=(j+1)%count; indices.extend([center,ring+k,ring+j] if end==0 else [center,ring+j,ring+k])
    attr={'POSITION':add_accessor(target,blob,vertices,'VEC3',True),'NORMAL':add_accessor(target,blob,normals,'VEC3')}
    while len(blob)%4: blob.append(0)
    v=len(target['bufferViews']); values=np.array(indices,dtype='<u2'); target['bufferViews'].append({'buffer':0,'byteOffset':len(blob),'byteLength':values.nbytes}); blob.extend(values.tobytes())
    ix=len(target['accessors']); target['accessors'].append({'bufferView':v,'componentType':5123,'count':len(indices),'type':'SCALAR'})
    mat=len(target['materials']); target['materials'].append({'name':'Graphite dumbbell','pbrMetallicRoughness':{'baseColorFactor':[.12,.15,.13,1],'metallicFactor':.55,'roughnessFactor':.4}})
    mesh=len(target['meshes']); target['meshes'].append({'name':'Dumbbell '+suffix,'primitives':[{'attributes':attr,'indices':ix,'material':mat}]})
    wrist=byname['wrist.'+suffix]; w=bind[wrist]
    # Grip center lies in the palm, rather than on the wrist joint.
    point=np.array([.045 if suffix=='L' else -.045,-.050,.080])
    local=w[:3,:3].T@point
    index=len(target['nodes']); target['nodes'].append({'name':'Dumbbell.'+suffix,'mesh':mesh,'translation':local.tolist(),'rotation':quat(w[:3,:3].T).tolist()})
    target['nodes'][wrist].setdefault('children',[]).append(index)

def write_glb(path,target,blob):
    target['buffers']=[{'byteLength':len(blob)}]
    js=json.dumps(target,separators=(',',':'),ensure_ascii=True).encode(); js+=b' '*((-len(js))%4); blob+=b'\0'*((-len(blob))%4)
    raw=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
    path.write_bytes(raw); return hashlib.sha256(raw).hexdigest()

OUTPUT.mkdir(parents=True,exist_ok=True)
if not (ROOT / 'site/source-assets/human-base.glb').exists():
    base,baseblob=compact_geometry(doc)
    base['extras']={'geometry_source':'CC0 MakeHuman via OpenGym3D; original upstream motion removed'}
    (ROOT / 'site/source-assets').mkdir(exist_ok=True)
    write_glb(ROOT / 'site/source-assets/human-base.glb',base,baseblob)
reports=[]
for kind in ['squat','push-up','dumbbell-curl']:
    target,blob=compact_geometry(doc); duration=4.0; frames=97
    poses=[pose(kind,i/(frames-1)) for i in range(frames)]
    anim={'name':kind+' / original sample','channels':[],'samplers':[]}
    times=add_accessor(target,blob,np.linspace(0,duration,frames),'SCALAR',True)
    max_drift=0.; loop_error=0.
    for i in joints:
        parent=parents.get(i); values={'translation':[],'rotation':[]}
        previous=None
        for world in poses:
            local=np.linalg.inv(world[parent])@world[i] if parent in world else world[i]
            q=quat(local[:3,:3])
            if previous is not None and np.dot(q,previous)<0:q=-q
            previous=q; values['rotation'].append(q); values['translation'].append(local[:3,3])
            reference=np.linalg.norm((np.linalg.inv(bind[parent])@bind[i])[:3,3]) if parent in bind else None
            if reference is not None:max_drift=max(max_drift,abs(np.linalg.norm(local[:3,3])-reference))
        loop_error=max(loop_error,float(np.max(np.abs(poses[0][i]-poses[-1][i]))))
        for path,kindtype in [('translation','VEC3'),('rotation','VEC4')]:
            out=add_accessor(target,blob,values[path],kindtype)
            sample=len(anim['samplers']); anim['samplers'].append({'input':times,'output':out,'interpolation':'LINEAR'})
            anim['channels'].append({'sampler':sample,'target':{'node':i,'path':path}})
    target['animations']=[anim]
    if kind=='dumbbell-curl':
        for suffix in ['L','R']:dumbbell(target,blob,suffix)
    target.setdefault('extras',{}).update(sample_status='visual prototype; expert review pending',motion_source='Original JY FITNESS ATLAS kinematic animation; no upstream clip retained',geometry_source='CC0 MakeHuman geometry via OpenGym3D push_up.glb')
    sha=write_glb(OUTPUT/(kind+'.glb'),target,blob)
    # Bone lengths and loop closure are engineering checks, not movement validation.
    assert max_drift<.0001, (kind,max_drift)
    assert loop_error<.00001, (kind,loop_error)
    reports.append({'id':kind,'duration':duration,'frames':frames,'sha256':sha,'max_bone_length_drift_m':max_drift,'loop_matrix_error':loop_error,'professional_review':False})
print(json.dumps(reports,indent=2))
(ROOT/'site/dist/motion-lab/assets/build-report.json').write_text(json.dumps(reports,indent=2)+'\n',encoding='utf-8')
