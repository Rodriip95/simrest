import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Presentation, PresentationFile } from 'file:///C:/Users/rodri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'

process.env.RUNTIME_NODE_MODULES = 'C:/Users/rodri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
const workspaceDir = 'C:/Users/rodri/OneDrive/Escritorio/esteSi/restaurant-sim'
const skillDir = 'C:/Users/rodri/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations'
const build = path.join(workspaceDir, '.planning-build')
const output = path.join(workspaceDir, 'docs/planning/slides/restaurant-sim-roles.pptx')
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } })
const ink = '#203B32', accent = '#387C61', muted = '#5F6962', paper = '#F5F2E9'
function text(s, name, value, x, y, w, h, size, color=ink, bold=false) {
  const b = s.shapes.add({ geometry: 'textbox', name, position: { left:x, top:y, width:w, height:h }, fill:'none', line:{fill:'none', width:0, style:'solid'} })
  b.text = value
  b.text.style = { typeface:'Arial', fontSize:size, color, bold }
  return b
}
function slide(title, rows, note, dark=false) {
  const s = p.slides.add()
  s.background.fill = dark ? ink : paper
  const fg=dark?'#F5F2E9':ink
  text(s,'title',title,76,65,1120,110,48,fg,true)
  rows.forEach((r,i)=>{
    const yy = 220 + i*115
    text(s,`label-${i}`,r[0],76,yy,320,80,27,dark?'#B9D7C5':accent,true)
    text(s,`body-${i}`,r[1],425,yy,770,94,29,fg)
  })
  text(s,'page',String(p.slides.items.length).padStart(2,'0'),1150,650,60,30,18,dark?'#B9D7C5':muted)
  s.speakerNotes.text = note + '\nFuente: SPEC.md v2 y TASKS.md, 13 de octubre de 2026. Alcance planificado, salvo estado actual explícito.'
  return s
}
const cover=p.slides.add()
cover.background.fill=ink
text(cover,'title','Restaurant Sim',76,170,1120,115,76,'#F5F2E9',true)
text(cover,'subtitle','Roles y operación del salón',80,310,1100,90,42,'#B9D7C5')
text(cover,'scope','Plan de demo local\n13 de octubre de 2026',80,525,950,100,26,'#F5F2E9')
cover.speakerNotes.text='Propuesta basada en el pedido del usuario y SPEC.md v2. El código actual permite construir, seleccionar y eliminar mesas. Este deck presenta funcionalidades futuras, sin backend ni autenticación real.'
slide('Administrador',[
 ['Configuración','Construye el salón y ajusta mesas libres.'],
 ['Responsables','Asigna mesas y puede asistir cualquier mesa asignada.'],
 ['Visibilidad','Consulta métricas globales y por mozo.']
], 'SPEC §§2–4, 8. Construir/reiniciar requiere confirmación si hay datos. Admin puede editar capacidad de 1 a 8 solo en mesa libre. Las acciones de asistencia conservan actor separado del responsable asignado.')
slide('Supervisor',[
 ['Distribución','Asigna o reasigna mesas y mueve las que están libres.'],
 ['Atención','Ve clientes y la última mesa atendida por cada mozo.'],
 ['Seguimiento','Consulta ocupación, pedidos y esperas de la sesión.']
], 'SPEC §§2, 4, 7–8. Reasignar una mesa ocupada exige confirmación y resolver borrador. No puede reconstruir/resetear la demo. La última atención es simulada y se rotula como tal.')
slide('Mozo',[
 ['Sus mesas','Selecciona una mesa asignada para abrir la atención.'],
 ['Clientes','Ingresa la cantidad por voz o teclado y la confirma.'],
 ['Pedidos','Carga productos, confirma y marca la entrega.']
], 'SPEC §§2, 5–6. Puede finalizar visita sin pedidos pendientes de entrega y consultar métricas propias. No asigna mesas ni mueve mobiliario. Mesa ajena solo expone identificación y estado.')
slide('Mesas que se pueden mover',[
 ['Edición explícita','Mover activa un preview con pasos de 0,5 m.'],
 ['Espacio válido','Mantiene separación y límites del terreno.'],
 ['Confirmación','Guardar conserva la posición. Cancelar la revierte.']
], 'SPEC §3 / P03. Solo admin/supervisor y mesas sin visita activa. Cubo 1 m, margen al borde 0,5 m; separación entre centros >=2 en al menos un eje. Inputs X/Z como alternativa accesible. Deshabilitar cámara solo durante gesto; Escape/pointercancel revierten. Cámara e IDs se conservan.')
slide('Atención desde una mesa',[
 ['01  Ingreso','Clic en mesa libre, cantidad y confirmación de clientes.'],
 ['02  Pedido','Catálogo, cantidades y observaciones antes de confirmar.'],
 ['03  Cierre','Entregar pedidos y finalizar la visita con confirmación.']
], 'SPEC §§5–6. Propuesta de capacidad inicial 4 editable entre 1 y 8. Voz solo propone y requiere revisión. Sin soporte/permiso queda teclado. Los pedidos confirmados son inmutables e idempotentes. Cerrar visita no registra un pago. Nuevas visitas conservan asignación.')
slide('Clientes y mozos en la escena',[
 ['Clientes','Una esfera pequeña por persona, alrededor de la mesa.'],
 ['Mozos','Un cubo pequeño por mozo, junto a su mesa de atención.'],
 ['Supervisión','Nombre, mesas asignadas y última atención simulada.']
], 'SPEC §§4, 7 / P08. Radio esfera propuesto 0,12 m, cubo 0,28 m; mesa 1 m. Offsets deterministas de 1–8 clientes. Un mozo con varias mesas sigue teniendo un avatar. Espera si no atiende; al cambiar a Supervisor conservar snapshot rotulado. Sin física, modelos externos ni caminata.')
slide('Métricas de la sesión',[
 ['Estado actual','Ocupación, clientes presentes y mesas asignadas.'],
 ['Actividad','Pedidos confirmados y consumo registrado en ARS.'],
 ['Espera','Tiempo al primer pedido y mesas pendientes de pedido.']
], 'SPEC §8 / P10. Consumo no equivale a ingresos/cobros. Ocupación=activas/existentes; por mozo=ocupadas asignadas/asignadas. Espera promedio solo de visitas con primer pedido. Denominador cero o muestra vacía: Sin datos. Atribución de pedidos al responsable al confirmar; ocupación/clientes al actual. Reset/recarga reinicia.')
slide('Issues para implementar',[
 ['P01 a P04','Dominio, roles, movimiento y asignación de mesas.'],
 ['P05 a P08','Clientes, dictado, pedidos y avatares de atención.'],
 ['P09 a P11','Cierre, métricas y verificación del recorrido completo.']
], 'TASKS.md contiene historias, subtareas, dependencias y aceptación. Orden sugerido P01 P02 P03 P04 P05 P07 P06 P08 P09 P10 P11. P12 plataforma futura diferida. Issues locales, no publicados. B01/B02 implementados con validación visual pendiente.')
slide('Alcance de esta etapa',[
 ['Demo compartida','Cambiar de rol conserva datos confirmados en la sesión.'],
 ['Validación','Mouse, teclado, dictado y alternativas sin voz ni WebGL.'],
 ['Etapa posterior','Backend, permisos reales, cocina y pagos.']
], 'SPEC §§1, 10–11. Recargar restablece mocks. No colaboración entre dispositivos ni tracking real. Probar demo 25 mesas y máximo 200/1600 clientes antes de afirmar rendimiento. Plan y presentación no constituyen implementación.', true)
await fs.mkdir(build,{recursive:true})
await fs.mkdir(path.dirname(output),{recursive:true})
for (let i=0;i<p.slides.items.length;i++) {
  const png=await p.export({slide:p.slides.items[i],format:'png',scale:1})
  await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await png.arrayBuffer()))
}
const draft=path.join(build,'candidate.pptx')
await (await PresentationFile.exportPptx(p)).save(draft)
const { finalizePresentation }=await import(pathToFileURL(path.join(skillDir,'container_tools/artifact_tool_utils.mjs')).href)
const result=await finalizePresentation({
 workspaceDir, candidatePath:draft, finalPath:output,
 pythonExecutable:'C:/Users/rodri/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
 integrityValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 fontPolicy:{basis:'design',families:['Arial']},
 verifyArtifactToolImport:true,
 receiptPath:path.join(build,'validation.json')
})
console.log(JSON.stringify(result))



