import { createSystem, PanelUI, PanelDocument } from '@iwsdk/core';
import { Group, Vector3, Mesh } from 'three';

export class UISystem extends createSystem({
  panels: { required: [PanelUI, PanelDocument] },
}) {
  private fc = 0;

  init() {
    const group = new Group();
    group.position.set(0, 2.0, -1.0);
    const entity = (this.world as any).createTransformEntity(group);
    entity.addComponent(PanelUI, { config: './ui/menu.json' });
  }

  update() {
    this.fc++;
    if (this.fc === 60) {
      const q = (this as any).queries.panels;
      q.entities?.forEach?.((e: any) => {
        const doc = PanelDocument.data.document[e.index] as any;
        if (!doc) return;
        console.log('[UI] computedSize:', JSON.stringify(doc.computedSize));
        console.log('[UI] doc scale:', JSON.stringify(doc.scale));
        console.log('[UI] doc worldPos:', JSON.stringify(doc.getWorldPosition(new Vector3())));
        console.log('[UI] doc visible:', doc.visible, 'parent visible:', doc.parent?.visible);
        
        // Check all ancestors for visibility
        let obj = doc as any;
        let chain = '';
        while (obj) {
          chain += obj.type + '(v=' + obj.visible + ',s=' + obj.scale.x.toFixed(3) + ') -> ';
          obj = obj.parent;
        }
        console.log('[UI] chain:', chain);
        
        // Check mesh details
        let meshIdx = 0;
        doc.traverse?.((child: any) => {
          if (child.isMesh || child instanceof Mesh) {
            const wp = new Vector3();
            child.getWorldPosition(wp);
            console.log('[UI] mesh' + meshIdx + ': visible=' + child.visible + ' worldPos=' + JSON.stringify(wp) + ' worldScale=' + JSON.stringify(child.getWorldScale(new Vector3())) + ' frustumCulled=' + child.frustumCulled + ' renderOrder=' + child.renderOrder);
            meshIdx++;
          }
        });
        
        // Also check the entity's object3D
        console.log('[UI] entity obj3D worldPos:', JSON.stringify(e.object3D.getWorldPosition(new Vector3())));
      });
    }
  }
}
