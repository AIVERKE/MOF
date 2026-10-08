import { compareCodigos } from "./mofHelpers.js";

export const NODE_WIDTH = 320;
export const NODE_HEIGHT = 210; // Altura fija garantizada para evitar cualquier solapamiento
export const H_GAP = 90; // Separación horizontal generosa entre ramas
export const V_GAP = 140; // Separación vertical generosa tipo mapa conceptual para trazo ortogonal limpio
export const FACULTADES_EXTRA_GAP = 700; // Separación vertical adicional para dar respiro al piso de Facultades

export const LADO_RANK = {
  IZQUIERDA: 1,
  CENTRO: 2,
  AUTOMATICO: 3,
  DERECHA: 4,
};

/**
 * Mapea el peso jerárquico a un nivel visual unificado (tier) para las alas superiores:
 * - Secretarías (peso <= 7, ej. Secretaría General, Secretaría Académica): Tier 0
 * - Direcciones (peso 8, ej. DAF, Defensoría): Tier 1
 * - Departamentos (peso 9, ej. DAJD, DIPGIS, DTIC, DBS, DPD, etc.): Tier 2
 * - Divisiones (peso 10, ej. Transparencia, Biblioteca Central, etc.): Tier 3
 * - Posgrados directos (peso 15, ej. CEPIES, CIDES): Tier 4
 * - Secciones (peso 16, ej. Becas Académicas, Desconcentradas, Tributarias): Tier 5
 * - Estaciones / Centros / otros (peso >= 17): Tier 6
 */
export function getUpperUnifiedTier(peso) {
  if (peso <= 7) return 0; // Secretarías
  if (peso === 8) return 1; // Direcciones
  if (peso === 9) return 2; // Departamentos
  if (peso === 10) return 3; // Divisiones
  if (peso === 15) return 4; // Posgrados directos
  if (peso === 16) return 5; // Secciones
  if (peso >= 17) return 6; // Estaciones / Centros
  return 5;
}

export const isRectoradoNode = (n) =>
  n?.data?.orden === 5 ||
  String(n?.id) === "33" ||
  String(n?.data?.sigla || "").toUpperCase() === "REC" ||
  String(n?.data?.nombre || "")
    .toUpperCase()
    .includes("RECTORADO");

export const isVicerrectoradoNode = (n) =>
  n?.data?.orden === 6 ||
  String(n?.id) === "44" ||
  String(n?.data?.sigla || "").toUpperCase() === "VR" ||
  String(n?.data?.nombre || "")
    .toUpperCase()
    .includes("VICERRECTORADO");

export const isDecanato = (c) =>
  c?.data?.orden === 11 ||
  String(c?.data?.clase || "")
    .toUpperCase()
    .includes("DECANATO") ||
  String(c?.data?.nombre || "")
    .toUpperCase()
    .includes("DECANATO");

/**
 * Calcula las coordenadas (x, y) de los nodos para el organigrama respetando:
 * 1. Eje Troncal Institucional (X = 0, pisos verticales sucesivos).
 * 2. Ejes Locales Sub-troncales dentro de bloques (ej. Decanato -> Vicedecanato).
 * 3. Distribución lateral de unidades de apoyo / staff a los costados del eje local.
 * 4. Ramas u hojas finales compactas bajo el último nodo sub-troncal.
 * 5. Bloques paralelos sin solapamientos horizontales ni verticales.
 *
 * @param {Array} nodes - Nodos de Vue Flow
 * @param {Array} edges - Conexiones de Vue Flow
 * @returns {{ nodes: Array, edges: Array }}
 */
export function getLayoutedElements(nodes, edges) {
  // 1. Separar nodos normales de nodos staff (asesoría)
  const staffNodes = nodes.filter((n) => n.data && n.data.isStaff);
  const layoutNodes = nodes.filter((n) => !n.data || !n.data.isStaff);

  const byId = {};
  layoutNodes.forEach((u) => {
    byId[String(u.id)] = u;
  });

  const childrenMap = {};
  layoutNodes.forEach((u) => {
    const pId =
      u.parentId && byId[String(u.parentId)] ? String(u.parentId) : "root";
    if (!childrenMap[pId]) childrenMap[pId] = [];
    childrenMap[pId].push(u);
  });

  // Ordenar hermanos considerando primero su "lado" de preferencia, luego su peso jerárquico y luego su código numérico
  Object.keys(childrenMap).forEach((pId) => {
    childrenMap[pId].sort((a, b) => {
      const rankA = LADO_RANK[a.data?.lado] || 3;
      const rankB = LADO_RANK[b.data?.lado] || 3;
      if (rankA !== rankB) return rankA - rankB;

      // Ordenar por peso jerárquico ascendente (menor peso = mayor rango institucional, ej. Instituto 14 antes de Posgrado 15)
      const pesoA = a.data?.orden ?? 99;
      const pesoB = b.data?.orden ?? 99;
      if (pesoA !== pesoB) return pesoA - pesoB;

      return compareCodigos(a, b);
    });
  });

  const positions = {};
  const STEP = NODE_HEIGHT + V_GAP;

  function getDepth(rootId, unitId) {
    if (String(rootId) === String(unitId)) return 0;
    let d = 0;
    let cur = byId[String(unitId)];
    while (cur && String(cur.id) !== String(rootId)) {
      d++;
      cur = cur.parentId ? byId[String(cur.parentId)] : null;
    }
    return d;
  }

  /**
   * Mapea cada unidad a su nivel jerárquico ('altura') relativo a la raíz del bloque:
   * - Facultades (Decanatos 11): Vicedecanatos (12) -> Carreras (13) -> Institutos (14) -> Posgrados (15) -> Secciones (16) -> Estaciones (17+)
   * - Direcciones (DAF 8): Departamentos (9) -> Divisiones (10) -> Secciones (16)
   * - Departamentos (9): Divisiones (10) -> Secciones (16)
   * - Divisiones (10): Secciones (16)
   */
  function getSubtreeTier(rootUnit, unit) {
    if (!rootUnit || !unit) return 0;
    if (String(unit.id) === String(rootUnit.id)) return 0;
    const rootPeso = rootUnit.data?.orden ?? 99;
    const uPeso = unit.data?.orden ?? 99;

    if (rootPeso === 11) {
      // Decanatos (Piso 3 bajo Vicerrectorado)
      if (uPeso <= 11) return 0; // Decanatos
      if (uPeso === 12) return 1; // Vicedecanatos (Piso 4)
      if (uPeso === 13) return 2; // Carreras (Piso 5)
      if (uPeso === 14) return 3; // Institutos (Piso 6)
      if (uPeso === 15) return 4; // Posgrados (Piso 7)
      if (uPeso === 16) return 5; // Secciones (Piso 8)
      if (uPeso === 17) return 6; // Estaciones Experimentales (Piso 9)
      if (uPeso === 18) return 7; // Centros Experimentales (Piso 10)
      return 8; // Centros de Investigaciones (Piso 11)
    }
    if (rootPeso === 8) {
      // Direcciones (DAF, Piso 1 bajo Rectorado)
      if (uPeso <= 8) return 0;
      if (uPeso === 9) return 1; // Departamentos (Piso 2)
      if (uPeso === 10) return 2; // Divisiones (Piso 3)
      return 3; // Secciones (Piso 4)
    }
    if (rootPeso === 9) {
      // Departamentos
      if (uPeso <= 9) return 0;
      if (uPeso === 10) return 1; // Divisiones
      return 2; // Secciones
    }
    if (rootPeso === 10) {
      // Divisiones
      if (uPeso <= 10) return 0;
      return 1; // Secciones
    }
    if (rootPeso === 7) {
      // Secretaría (Piso 0)
      if (uPeso <= 7) return 0;
      if (uPeso === 8) return 1;
      if (uPeso === 9) return 2;
      if (uPeso === 10) return 3; // Divisiones
      return 4; // Secciones
    }
    if (rootPeso === 12) {
      // Vicedecanatos (Piso 4)
      if (uPeso <= 12) return 0;
      if (uPeso === 13) return 1; // Carreras (Piso 5)
      if (uPeso === 14) return 2; // Institutos (Piso 6)
      if (uPeso === 15) return 3; // Posgrados (Piso 7)
      if (uPeso === 16) return 4; // Secciones (Piso 8)
      if (uPeso === 17) return 5; // Estaciones (Piso 9)
      if (uPeso === 18) return 6; // Centros Experimentales (Piso 10)
      return 7; // Centros de Investigaciones (Piso 11)
    }
    if (rootPeso === 14) {
      // Institutos (Piso 6)
      if (uPeso <= 14) return 0;
      if (uPeso === 17) return 1; // Estaciones (Piso 9)
      if (uPeso === 18) return 2; // Centros Experimentales (Piso 10)
      return 3; // Centros de Investigaciones (Piso 11)
    }
    if (rootPeso === 15) {
      // Posgrados (Piso 7)
      if (uPeso <= 15) return 0;
      return 1; // Secciones (Piso 8)
    }
    return getDepth(rootUnit.id, unit.id);
  }

  /**
   * Calcula el offset de nivel jerárquico (en pasos verticales STEP) para dependencias directas del tronco:
   * - Bajo Rectorado (peso 5):
   *   - Peso 7 (Secretaría General): Piso 0
   *   - Peso 8 (Direcciones como DAF y Defensoría): Piso 1
   *   - Peso 9 (Departamentos directos de Rectorado): Piso 2 (alineado con Departamentos de DAF)
   *   - Peso 10 (Divisiones directas como Transparencia, Cultura, Becas): Piso 3 (alineado con Divisiones de Departamentos y DAF)
   *   - Peso >= 16 (Secciones directas): Piso 4
   * - Bajo Vicerrectorado (peso 6):
   *   - Peso 7 (Secretaría Académica): Piso 0
   *   - Peso 9 (Departamentos como DIPGIS, Evaluación, Bienestar, TIC, Docente): Piso 1
   *   - Peso 10 (Divisiones directas como Gestiones y Admisiones, Biblioteca Central): Piso 2 (alineado con Divisiones de Departamentos)
   *   - Peso 11 (Decanatos / Facultades): Piso 3 (Piso inicial de Facultades en nivel 11)
   *   - Peso 15 (Posgrados directos como CEPIES, CIDES): Piso 7 (alineado con Posgrados)
   */
  function getWingTierOffset(parentTrunkNode, childNode) {
    if (!parentTrunkNode || !childNode) return 0;
    const pPeso = parentTrunkNode.data?.orden ?? 99;
    const cPeso = childNode.data?.orden ?? 99;

    if (pPeso === 5) {
      if (cPeso <= 7) return 0; // Secretaría General (7)
      if (cPeso === 8) return 1; // Direcciones (8)
      if (cPeso === 9) return 2; // Departamentos (9)
      if (cPeso === 10) return 3; // Divisiones (10)
      return 4; // Secciones (16)
    }

    if (pPeso === 6) {
      if (cPeso <= 7) return 0; // Secretaría Académica (7)
      if (cPeso <= 9) return 1; // Departamentos (9)
      if (cPeso === 10) return 2; // Divisiones (10)
      if (cPeso === 11) return 3; // Decanatos / Facultades (11)
      if (cPeso === 15) return 7; // Posgrados directos (15)
      return 3;
    }

    return 0;
  }

  const widthMemo = new Map();

  // Función recursiva memoizada para calcular el ancho total necesario para cualquier subárbol
  function getSubtreeWidth(nodeId) {
    if (widthMemo.has(nodeId)) return widthMemo.get(nodeId);
    const children = childrenMap[nodeId] || [];
    let width;
    if (children.length === 0) {
      width = NODE_WIDTH;
    } else {
      const subTrunkChildren = children.filter(
        (c) => c.data?.esSubTroncal === true || c.data?.esSubtroncal === true,
      );
      if (subTrunkChildren.length > 0) {
        const primarySubTrunk = subTrunkChildren[0];
        const otherChildren = children.filter(
          (c) => String(c.id) !== String(primarySubTrunk.id),
        );
        const leftWings = otherChildren.filter(
          (c) => c.data?.lado === "IZQUIERDA",
        );
        const rightWings = otherChildren.filter(
          (c) => c.data?.lado === "DERECHA",
        );
        const autoWings = otherChildren.filter(
          (c) => c.data?.lado !== "IZQUIERDA" && c.data?.lado !== "DERECHA",
        );
        autoWings.forEach((c) => {
          if (leftWings.length <= rightWings.length) leftWings.push(c);
          else rightWings.push(c);
        });

        const wLeft =
          leftWings.length > 0
            ? leftWings.reduce(
                (sum, c) => sum + getSubtreeWidth(String(c.id)) + H_GAP,
                0,
              ) - H_GAP
            : 0;
        const wRight =
          rightWings.length > 0
            ? rightWings.reduce(
                (sum, c) => sum + getSubtreeWidth(String(c.id)) + H_GAP,
                0,
              ) - H_GAP
            : 0;
        const wSubTrunk = getSubtreeWidth(String(primarySubTrunk.id));

        const leftPart = wLeft > 0 ? wLeft + H_GAP : 0;
        const rightPart = wRight > 0 ? H_GAP + wRight : 0;
        width = leftPart + Math.max(NODE_WIDTH, wSubTrunk) + rightPart;
      } else {
        const totalW =
          children.reduce(
            (sum, c) => sum + getSubtreeWidth(String(c.id)) + H_GAP,
            0,
          ) - H_GAP;
        width = Math.max(NODE_WIDTH, totalW);
      }
    }
    widthMemo.set(nodeId, width);
    return width;
  }

  /**
   * Construye un mapa dinámico { peso -> tierIndex } para los pesos únicos presentes
   * en el subárbol o sección correspondiente, ordenados jerárquicamente ascendente.
   * Esto garantiza que CUALQUIER sección troncal actual o futura distribuya automáticamente
   * sus unidades por pisos según los pesos reales de sus dependencias sin necesidad de código estático.
   */
  function buildDynamicSectionPesoMap(rootId, stopIdSet = null) {
    const pesosSet = new Set();
    function walk(id) {
      const children = childrenMap[id] || [];
      children.forEach((c) => {
        if (stopIdSet && stopIdSet.has(String(c.id))) return;
        pesosSet.add(c.data?.orden ?? 99);
        walk(String(c.id));
      });
    }
    walk(String(rootId));
    const sortedPesos = Array.from(pesosSet).sort((a, b) => a - b);
    const rankMap = new Map();
    sortedPesos.forEach((p, index) => {
      rankMap.set(p, index);
    });
    return rankMap;
  }

  // Función recursiva para posicionar cualquier subárbol sin colisiones respetando las alturas (tiers) por peso
  function layoutSubtree(
    nodeId,
    startX,
    startY,
    rootUnit = null,
    forceX = null,
    pesoRankMap = null,
    parentY = null,
  ) {
    const curUnit = byId[nodeId];
    if (!curUnit) return;
    if (!rootUnit) rootUnit = curUnit;
    const uPeso = curUnit.data?.orden ?? 99;

    let nodeY;
    if (typeof pesoRankMap === "function") {
      nodeY = startY + pesoRankMap(uPeso) * STEP;
    } else if (pesoRankMap && pesoRankMap.has(uPeso)) {
      nodeY = startY + pesoRankMap.get(uPeso) * STEP;
    } else {
      const tier = getSubtreeTier(rootUnit, curUnit);
      nodeY = startY + tier * STEP;
    }

    if (parentY !== null && nodeY <= parentY) {
      nodeY = parentY + STEP;
    }

    const children = childrenMap[nodeId] || [];
    if (children.length === 0) {
      positions[nodeId] = { x: forceX !== null ? forceX : startX, y: nodeY };
      return;
    }

    const subTrunkChildren = children.filter(
      (c) => c.data?.esSubTroncal === true || c.data?.esSubtroncal === true,
    );

    if (subTrunkChildren.length > 0) {
      const primarySubTrunk = subTrunkChildren[0];
      const otherChildren = children.filter(
        (c) => String(c.id) !== String(primarySubTrunk.id),
      );
      const leftWings = otherChildren.filter(
        (c) => c.data?.lado === "IZQUIERDA",
      );
      const rightWings = otherChildren.filter(
        (c) => c.data?.lado === "DERECHA",
      );
      const autoWings = otherChildren.filter(
        (c) => c.data?.lado !== "IZQUIERDA" && c.data?.lado !== "DERECHA",
      );
      autoWings.forEach((c) => {
        if (leftWings.length <= rightWings.length) leftWings.push(c);
        else rightWings.push(c);
      });

      const wLeft =
        leftWings.length > 0
          ? leftWings.reduce(
              (sum, c) => sum + getSubtreeWidth(String(c.id)) + H_GAP,
              0,
            ) - H_GAP
          : 0;
      const wSubTrunk = getSubtreeWidth(String(primarySubTrunk.id));
      const leftOffset = wLeft > 0 ? wLeft + H_GAP : 0;
      const spineX =
        startX +
        leftOffset +
        (Math.max(NODE_WIDTH, wSubTrunk) - NODE_WIDTH) / 2;

      positions[nodeId] = { x: forceX !== null ? forceX : spineX, y: nodeY };

      // Alas izquierdas: colocadas secuencialmente dentro de [startX, startX + wLeft]
      let curLeftX = startX;
      leftWings.forEach((c) => {
        const w = getSubtreeWidth(String(c.id));
        layoutSubtree(
          String(c.id),
          curLeftX,
          startY,
          rootUnit,
          null,
          pesoRankMap,
          nodeY,
        );
        curLeftX += w + H_GAP;
      });

      // Nodo sub-troncal alineado verticalmente en el EXACTO mismo eje X local (spineX)
      const subTrunkStartX = startX + leftOffset;
      layoutSubtree(
        String(primarySubTrunk.id),
        subTrunkStartX,
        startY,
        rootUnit,
        spineX,
        pesoRankMap,
        nodeY,
      );

      // Alas derechas: colocadas secuencialmente después del subtronco
      let curRightX = subTrunkStartX + Math.max(NODE_WIDTH, wSubTrunk) + H_GAP;
      rightWings.forEach((c) => {
        const w = getSubtreeWidth(String(c.id));
        layoutSubtree(
          String(c.id),
          curRightX,
          startY,
          rootUnit,
          null,
          pesoRankMap,
          nodeY,
        );
        curRightX += w + H_GAP;
      });
      return;
    }

    // Nodo con hijos normales: cascada simétrica centrada respetando altura por tier
    const totalW =
      children.reduce(
        (sum, c) => sum + getSubtreeWidth(String(c.id)) + H_GAP,
        0,
      ) - H_GAP;

    let curX = forceX !== null ? forceX + NODE_WIDTH / 2 - totalW / 2 : startX;
    const childCenters = [];
    children.forEach((c) => {
      const w = getSubtreeWidth(String(c.id));
      layoutSubtree(
        String(c.id),
        curX,
        startY,
        rootUnit,
        null,
        pesoRankMap,
        nodeY,
      );
      childCenters.push(positions[String(c.id)].x + NODE_WIDTH / 2);
      curX += w + H_GAP;
    });

    if (forceX !== null) {
      positions[nodeId] = { x: forceX, y: nodeY };
    } else {
      const parentCenterX =
        (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
      positions[nodeId] = { x: parentCenterX - NODE_WIDTH / 2, y: nodeY };
    }
  }

  // Función comparadora de nodos troncales: orden jerárquico por peso/nivel, luego por código numérico
  const compareTroncales = (a, b) => {
    const pesoA = a.data?.orden ?? 99;
    const pesoB = b.data?.orden ?? 99;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return compareCodigos(a, b);
  };

  // Comprobar si hay unidades marcadas como troncales
  // Nodos con esTroncal === true pertenecen al Eje Central Institucional
  const trunkNodes = layoutNodes
    .filter((n) => n.data?.esTroncal === true)
    .sort(compareTroncales);

  const hasInstitutionalSpine =
    trunkNodes.length >= 2 ||
    trunkNodes.some(isVicerrectoradoNode) ||
    trunkNodes.some(isRectoradoNode);

  let decanatosBusY = null;
  const decanatosSet = new Set();

  if (hasInstitutionalSpine) {
    // =========================================================================
    // 🏛️ LAYOUT INSTITUCIONAL DINÁMICO POR PISOS (EJE TRONCAL Y ALAS SIMÉTRICAS)
    // =========================================================================
    const TRUNK_X = 0; // El Eje Central de Gobierno se alinea en X = 0

    // Conjunto de IDs troncales para filtrado O(1)
    const trunkIds = new Set(trunkNodes.map((n) => String(n.id)));

    // Identificar raíces troncales (nodos troncales cuyo padre no es otro nodo troncal)
    const trunkRoots = trunkNodes.filter(
      (n) => !n.parentId || !trunkIds.has(String(n.parentId)),
    );
    trunkRoots.sort(compareTroncales);

    // Recorrer la cadena del tronco en orden jerárquico topológico
    const orderedTrunk = [];
    function traverseTrunk(node) {
      orderedTrunk.push(node);
      const trunkChildren = (childrenMap[String(node.id)] || [])
        .filter((c) => trunkIds.has(String(c.id)))
        .sort(compareTroncales);
      trunkChildren.forEach(traverseTrunk);
    }
    trunkRoots.forEach(traverseTrunk);

    // Por seguridad, si algún nodo troncal quedó fuera (árboles desconectados), agregarlo
    trunkNodes
      .slice()
      .sort(compareTroncales)
      .forEach((n) => {
        if (!orderedTrunk.some((o) => String(o.id) === String(n.id))) {
          orderedTrunk.push(n);
        }
      });

    const recNode = orderedTrunk.find(isRectoradoNode);
    const vrNode = orderedTrunk.find(isVicerrectoradoNode);

    const processedTrunkIds = new Set();
    let curTrunkY = 50;

    orderedTrunk.forEach((tNode) => {
      const tId = String(tNode.id);
      if (processedTrunkIds.has(tId)) return;

      // =========================================================================
      // CASO 1: RECTORADO Y VICERRECTORADO AMBOS PRESENTES
      // =========================================================================
      if (
        recNode &&
        vrNode &&
        (tId === String(recNode.id) || tId === String(vrNode.id))
      ) {
        const recId = String(recNode.id);
        const vrId = String(vrNode.id);
        processedTrunkIds.add(recId);
        processedTrunkIds.add(vrId);

        // 1. Posicionar Rectorado y Vicerrectorado directamente en el tronco central
        positions[recId] = { x: TRUNK_X, y: curTrunkY };
        const recY = curTrunkY;
        const vrY = recY + NODE_HEIGHT + V_GAP;
        positions[vrId] = { x: TRUNK_X, y: vrY };

        // 2. Obtener dependencias no troncales
        const recChildren = (childrenMap[recId] || []).filter(
          (c) => !trunkIds.has(String(c.id)),
        );
        const vrChildren = (childrenMap[vrId] || []).filter(
          (c) => !trunkIds.has(String(c.id)),
        );

        // Decanatos: van alineados abajo con la línea larga
        const decanatos = [
          ...vrChildren.filter(isDecanato),
          ...recChildren.filter(isDecanato),
        ];
        decanatos.forEach((d) => decanatosSet.add(String(d.id)));

        // Distribución dinámica de dependencias superiores según el lado configurado en cada troncal:
        // Rectorado: por defecto 'IZQUIERDA' (o según recNode.data?.lado)
        // Vicerrectorado: por defecto 'DERECHA' (o según vrNode.data?.lado)
        const recNonDec = recChildren.filter((c) => !isDecanato(c));
        const vrNonDec = vrChildren.filter((c) => !isDecanato(c));

        const recLado = recNode.data?.lado;
        const vrLado = vrNode.data?.lado;

        const leftWings = [];
        const rightWings = [];

        // Dependencias de Rectorado
        if (recLado === "DERECHA") {
          rightWings.push(...recNonDec);
        } else if (recLado === "CENTRO") {
          recNonDec.forEach((c) => {
            if (c.data?.lado === "DERECHA") rightWings.push(c);
            else if (c.data?.lado === "IZQUIERDA") leftWings.push(c);
            else {
              if (leftWings.length <= rightWings.length) leftWings.push(c);
              else rightWings.push(c);
            }
          });
        } else {
          // Default institucional: Ala Izquierda
          leftWings.push(...recNonDec);
        }

        // Dependencias de Vicerrectorado
        if (vrLado === "IZQUIERDA") {
          leftWings.push(...vrNonDec);
        } else if (vrLado === "CENTRO") {
          vrNonDec.forEach((c) => {
            if (c.data?.lado === "IZQUIERDA") leftWings.push(c);
            else if (c.data?.lado === "DERECHA") rightWings.push(c);
            else {
              if (rightWings.length <= leftWings.length) rightWings.push(c);
              else leftWings.push(c);
            }
          });
        } else {
          // Default académico: Ala Derecha
          rightWings.push(...vrNonDec);
        }

        // En el ala izquierda (se despliega de derecha a izquierda, alejándose del tronco hacia X negativo):
        // DERECHA significa pegado al eje central (se procesa primero cerca de -90)
        // IZQUIERDA significa hacia el borde exterior (se procesa al final lejos de -90)
        leftWings.sort((a, b) => {
          const rankA = a.data?.lado === "DERECHA" ? 1 : a.data?.lado === "IZQUIERDA" ? 3 : 2;
          const rankB = b.data?.lado === "DERECHA" ? 1 : b.data?.lado === "IZQUIERDA" ? 3 : 2;
          if (rankA !== rankB) return rankA - rankB;

          const pesoA = a.data?.orden ?? 99;
          const pesoB = b.data?.orden ?? 99;
          if (pesoA !== pesoB) return pesoA - pesoB;

          return compareCodigos(a, b);
        });

        // En el ala derecha (se despliega de izquierda a derecha, alejándose del tronco hacia X positivo):
        // IZQUIERDA significa pegado al eje central (se procesa primero cerca de 410)
        // DERECHA significa hacia el borde exterior (se procesa al final lejos de 410)
        rightWings.sort((a, b) => {
          const rankA = a.data?.lado === "IZQUIERDA" ? 1 : a.data?.lado === "DERECHA" ? 3 : 2;
          const rankB = b.data?.lado === "IZQUIERDA" ? 1 : b.data?.lado === "DERECHA" ? 3 : 2;
          if (rankA !== rankB) return rankA - rankB;

          const pesoA = a.data?.orden ?? 99;
          const pesoB = b.data?.orden ?? 99;
          if (pesoA !== pesoB) return pesoA - pesoB;

          return compareCodigos(a, b);
        });

        const upperWingsStartY = vrY + NODE_HEIGHT + V_GAP;

        // Trazar Ala Izquierda (se expande hacia X negativo)
        let curLeftX = TRUNK_X - H_GAP;
        leftWings.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          curLeftX -= w;
          const parentTrunkY = String(c.parentId) === vrId ? vrY : recY;
          layoutSubtree(
            String(c.id),
            curLeftX,
            upperWingsStartY,
            c,
            null,
            getUpperUnifiedTier,
            parentTrunkY,
          );
          curLeftX -= H_GAP;
        });

        // Trazar Ala Derecha (se expande hacia X positivo)
        let curRightX = TRUNK_X + NODE_WIDTH + H_GAP;
        rightWings.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          const parentTrunkY = String(c.parentId) === recId ? recY : vrY;
          layoutSubtree(
            String(c.id),
            curRightX,
            upperWingsStartY,
            c,
            null,
            getUpperUnifiedTier,
            parentTrunkY,
          );
          curRightX += w + H_GAP;
        });

        // Calcular cota inferior alcanzada por todas las unidades superiores
        let maxUpperY = vrY;
        Object.keys(positions).forEach((id) => {
          if (positions[id].y > maxUpperY) maxUpperY = positions[id].y;
        });

        // Trazar Decanatos en piso inferior alineado horizontalmente con línea central larga
        if (decanatos.length > 0) {
          const decanatosY =
            maxUpperY + NODE_HEIGHT + V_GAP + FACULTADES_EXTRA_GAP;
          decanatosBusY = decanatosY - (V_GAP + FACULTADES_EXTRA_GAP) / 2;

          const totalDecWidth =
            decanatos.reduce(
              (sum, d) => sum + getSubtreeWidth(String(d.id)) + H_GAP,
              0,
            ) - H_GAP;
          const trunkCenterX = TRUNK_X + NODE_WIDTH / 2;
          let curDecX = trunkCenterX - totalDecWidth / 2;

          decanatos.forEach((d) => {
            const w = getSubtreeWidth(String(d.id));
            layoutSubtree(
              String(d.id),
              curDecX,
              decanatosY,
              d,
              null,
              null,
              null,
            );
            curDecX += w + H_GAP;
          });
        }

        let maxOverallY = vrY;
        Object.keys(positions).forEach((id) => {
          if (positions[id].y > maxOverallY) maxOverallY = positions[id].y;
        });
        curTrunkY = maxOverallY + NODE_HEIGHT + V_GAP;
        return;
      }

      // =========================================================================
      // CASO 2: SÓLO VICERRECTORADO EN EL TRONCO (VISTA FILTRADA DESDE VR)
      // =========================================================================
      if (vrNode && tId === String(vrNode.id)) {
        const vrId = String(vrNode.id);
        processedTrunkIds.add(vrId);
        positions[vrId] = { x: TRUNK_X, y: curTrunkY };
        const vrY = curTrunkY;

        const vrChildren = (childrenMap[vrId] || []).filter(
          (c) => !trunkIds.has(String(c.id)),
        );
        const decanatos = vrChildren.filter(isDecanato);
        decanatos.forEach((d) => decanatosSet.add(String(d.id)));

        const wings = vrChildren.filter((c) => !isDecanato(c));
        const vrLado = vrNode.data?.lado;
        let leftWings = [];
        let rightWings = [];
        if (vrLado === "IZQUIERDA") {
          leftWings = wings;
        } else if (vrLado === "DERECHA") {
          rightWings = wings;
        } else {
          leftWings = wings.filter((c) => c.data?.lado === "IZQUIERDA");
          rightWings = wings.filter((c) => c.data?.lado !== "IZQUIERDA");
        }

        const upperWingsStartY = vrY + NODE_HEIGHT + V_GAP;

        let curLeftX = TRUNK_X - H_GAP;
        leftWings.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          curLeftX -= w;
          layoutSubtree(
            String(c.id),
            curLeftX,
            upperWingsStartY,
            c,
            null,
            getUpperUnifiedTier,
            vrY,
          );
          curLeftX -= H_GAP;
        });

        let curRightX = TRUNK_X + NODE_WIDTH + H_GAP;
        rightWings.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          layoutSubtree(
            String(c.id),
            curRightX,
            upperWingsStartY,
            c,
            null,
            getUpperUnifiedTier,
            vrY,
          );
          curRightX += w + H_GAP;
        });

        let maxUpperY = vrY;
        Object.keys(positions).forEach((id) => {
          if (positions[id].y > maxUpperY) maxUpperY = positions[id].y;
        });

        if (decanatos.length > 0) {
          const decanatosY =
            maxUpperY + NODE_HEIGHT + V_GAP + FACULTADES_EXTRA_GAP;
          decanatosBusY = decanatosY - (V_GAP + FACULTADES_EXTRA_GAP) / 2;

          const totalDecWidth =
            decanatos.reduce(
              (sum, d) => sum + getSubtreeWidth(String(d.id)) + H_GAP,
              0,
            ) - H_GAP;
          const trunkCenterX = TRUNK_X + NODE_WIDTH / 2;
          let curDecX = trunkCenterX - totalDecWidth / 2;

          decanatos.forEach((d) => {
            const w = getSubtreeWidth(String(d.id));
            layoutSubtree(
              String(d.id),
              curDecX,
              decanatosY,
              d,
              null,
              null,
              null,
            );
            curDecX += w + H_GAP;
          });
        }

        let maxOverallY = vrY;
        Object.keys(positions).forEach((id) => {
          if (positions[id].y > maxOverallY) maxOverallY = positions[id].y;
        });
        curTrunkY = maxOverallY + NODE_HEIGHT + V_GAP;
        return;
      }

      // =========================================================================
      // CASO 3: NODO TRONCAL GENERAL (CI, ADE, HCU, CE-HCU, ETC.)
      // =========================================================================
      processedTrunkIds.add(tId);
      positions[tId] = { x: TRUNK_X, y: curTrunkY };
      const T_Y = curTrunkY;

      const nonTrunkChildren = (childrenMap[tId] || []).filter(
        (c) => !trunkIds.has(String(c.id)),
      );

      if (nonTrunkChildren.length > 0) {
        const sectionPesoRankMap = buildDynamicSectionPesoMap(tId, trunkIds);

        const trunkLado = tNode.data?.lado;
        let left = [];
        let right = [];
        let center = [];

        if (trunkLado === "IZQUIERDA") {
          left = nonTrunkChildren;
        } else if (trunkLado === "DERECHA") {
          right = nonTrunkChildren;
        } else {
          // CENTRO o AUTOMATICO: se distribuyen a ambos lados equilibradamente
          left = nonTrunkChildren.filter(
            (c) => c.data?.lado === "IZQUIERDA",
          );
          right = nonTrunkChildren.filter(
            (c) => c.data?.lado === "DERECHA",
          );
          center = nonTrunkChildren.filter(
            (c) => c.data?.lado === "CENTRO",
          );
          const auto = nonTrunkChildren.filter(
            (c) =>
              c.data?.lado !== "IZQUIERDA" &&
              c.data?.lado !== "DERECHA" &&
              c.data?.lado !== "CENTRO",
          );

          auto.forEach((c) => {
            if (left.length <= right.length) left.push(c);
            else right.push(c);
          });
        }

        left.sort((a, b) => {
          const rankA = a.data?.lado === "DERECHA" ? 1 : a.data?.lado === "IZQUIERDA" ? 3 : 2;
          const rankB = b.data?.lado === "DERECHA" ? 1 : b.data?.lado === "IZQUIERDA" ? 3 : 2;
          if (rankA !== rankB) return rankA - rankB;

          const pesoA = a.data?.orden ?? 99;
          const pesoB = b.data?.orden ?? 99;
          if (pesoA !== pesoB) return pesoA - pesoB;

          return compareCodigos(a, b);
        });

        right.sort((a, b) => {
          const rankA = a.data?.lado === "IZQUIERDA" ? 1 : a.data?.lado === "DERECHA" ? 3 : 2;
          const rankB = b.data?.lado === "IZQUIERDA" ? 1 : b.data?.lado === "DERECHA" ? 3 : 2;
          if (rankA !== rankB) return rankA - rankB;

          const pesoA = a.data?.orden ?? 99;
          const pesoB = b.data?.orden ?? 99;
          if (pesoA !== pesoB) return pesoA - pesoB;

          return compareCodigos(a, b);
        });

        const wingsStartY = T_Y + NODE_HEIGHT + V_GAP;

        let curLeftX = TRUNK_X - H_GAP;
        left.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          curLeftX -= w;
          layoutSubtree(
            String(c.id),
            curLeftX,
            wingsStartY,
            null,
            null,
            sectionPesoRankMap,
            T_Y,
          );
          curLeftX -= H_GAP;
        });

        let curRightX = TRUNK_X + NODE_WIDTH + H_GAP;
        right.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          layoutSubtree(
            String(c.id),
            curRightX,
            wingsStartY,
            null,
            null,
            sectionPesoRankMap,
            T_Y,
          );
          curRightX += w + H_GAP;
        });

        center.forEach((c) => {
          layoutSubtree(
            String(c.id),
            TRUNK_X,
            wingsStartY,
            null,
            null,
            sectionPesoRankMap,
            T_Y,
          );
        });
      }

      let maxCurrentY = T_Y;
      Object.keys(positions).forEach((id) => {
        if (positions[id].y > maxCurrentY) maxCurrentY = positions[id].y;
      });

      curTrunkY = maxCurrentY + NODE_HEIGHT + V_GAP;
    });

    // 4. Posicionar cualquier nodo que no esté conectado al tronco (ej: raíces secundarias)
    const unpositionedRoots = layoutNodes.filter(
      (n) =>
        !positions[String(n.id)] && (!n.parentId || !byId[String(n.parentId)]),
    );
    if (unpositionedRoots.length > 0) {
      let maxPlacedX = TRUNK_X + NODE_WIDTH;
      Object.keys(positions).forEach((id) => {
        if (positions[id].x > maxPlacedX) maxPlacedX = positions[id].x;
      });
      let startExtraX = maxPlacedX + H_GAP * 2;
      unpositionedRoots.forEach((r) => {
        const treePesoMap = buildDynamicSectionPesoMap(String(r.id));
        layoutSubtree(String(r.id), startExtraX, 50, null, null, treePesoMap);
        startExtraX += getSubtreeWidth(String(r.id)) + H_GAP * 2;
      });
    }
  } else {
    // =========================================================================
    // 🌳 ÁRBOL JERÁRQUICO SIMÉTRICO ESTÁNDAR (PARA FILTROS Y BÚSQUEDAS)
    // =========================================================================
    const rootNodes = childrenMap["root"] || [];
    let startX = 50;
    rootNodes.forEach((r) => {
      const treePesoMap = buildDynamicSectionPesoMap(String(r.id));
      layoutSubtree(String(r.id), startX, 50, null, null, treePesoMap);
      startX += getSubtreeWidth(String(r.id)) + H_GAP * 2;
    });
  }

  // Asignar posiciones calculadas a todos los nodos normales
  layoutNodes.forEach((node) => {
    if (positions[String(node.id)]) {
      node.position = { ...positions[String(node.id)] };
    } else {
      node.position = { x: 50, y: 50 };
    }
  });

  // 6. Posicionar nodos Staff (Asesoría) a los lados de sus padres
  const staffByParent = {};
  staffNodes.forEach((node) => {
    const pId = String(node.parentId || "root");
    if (!staffByParent[pId]) staffByParent[pId] = [];
    staffByParent[pId].push(node);
  });

  Object.keys(staffByParent).forEach((parentId) => {
    const parentNode = layoutNodes.find(
      (n) => String(n.id) === String(parentId),
    );
    const parentStaffs = staffByParent[parentId];
    if (parentNode && parentNode.position) {
      parentStaffs.forEach((staffNode, index) => {
        const side =
          staffNode.data?.staffSide || (index % 2 === 0 ? "right" : "left");
        const multiplier = side === "right" ? 1 : -1;
        const indexInSide = Math.floor(index / 2);

        staffNode.position = {
          x: parentNode.position.x + multiplier * (NODE_WIDTH + 80),
          y:
            parentNode.position.y +
            (NODE_HEIGHT + V_GAP) / 2 +
            indexInSide * (NODE_HEIGHT + 40),
        };
      });
    } else {
      parentStaffs.forEach((staffNode) => {
        staffNode.position = { x: 50, y: 50 };
      });
    }
  });

  // 7. Anotar busY ortogonal seguro a las aristas normales
  edges.forEach((edge) => {
    const parentPos = positions[String(edge.source)];
    const childNode = byId[String(edge.target)];
    const isStaff = childNode?.data?.isStaff;
    if (parentPos && !isStaff) {
      const isDecanatoChild = decanatosSet.has(String(edge.target));
      const busY =
        isDecanatoChild && decanatosBusY !== null
          ? decanatosBusY
          : parentPos.y + NODE_HEIGHT + V_GAP / 2;

      edge.data = {
        ...edge.data,
        busY,
        borderRadius: 0,
      };
    }
  });

  return { nodes, edges };
}
