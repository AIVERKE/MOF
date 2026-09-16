import jsPDF from "jspdf";

/**
 * Formatea una fecha a formato legible boliviano/estándar: DD/MM/YYYY HH:mm
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatReportDate(date = new Date()) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Escapa un valor para formato CSV según RFC 4180.
 * @param {any} val
 * @returns {string}
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporta datos tabulares a un archivo CSV con BOM UTF-8 (\uFEFF)
 * para compatibilidad nativa inmediata con Excel y LibreOffice.
 *
 * @param {Object} options
 * @param {string} options.filename - Nombre del archivo a descargar
 * @param {Array<{header: string, key?: string, getter?: Function}>} options.columns - Definición de columnas
 * @param {Array<Object>} options.rows - Array de objetos a exportar
 * @returns {boolean}
 */
export function exportToCsv({ filename = "reporte.csv", columns = [], rows = [] }) {
  if (!columns || !columns.length || !rows || !rows.length) {
    return false;
  }

  const headerLine = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const dataLines = rows.map((row) => {
    return columns
      .map((col) => {
        let val;
        if (typeof col.getter === "function") {
          val = col.getter(row);
        } else if (col.key) {
          val = row[col.key];
        } else {
          val = "";
        }
        return escapeCsvValue(val);
      })
      .join(",");
  });

  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", safeFilename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/**
 * Sanitiza texto para compatibilidad 100% con fuentes estándar de jsPDF (WinAnsi/Latin-1).
 * Elimina o traduce caracteres de dibujo de cajas, viñetas complejas u otros símbolos Unicode
 * que causan corrupción de fuentes (% % %), espaciado anómalo o textos superpuestos.
 *
 * @param {any} val
 * @returns {string}
 */
export function sanitizePdfText(val) {
  if (val === null || val === undefined) return "";
  let str = String(val);
  // Reemplazar caracteres de dibujo de cajas Unicode (U+2500 a U+257F)
  str = str.replace(/[\u2500-\u257F]/g, "-");
  // Reemplazar viñetas y símbolos especiales Unicode
  str = str.replace(/[\u2022\u2023\u25E6\u2043\u2219\u00B7]/g, "-");
  // Reemplazar guiones Unicode
  str = str.replace(/[\u2010-\u2015\u2212]/g, "-");
  // Reemplazar comillas tipográficas
  str = str.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  str = str.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  // Reemplazar elipsis
  str = str.replace(/\u2026/g, "...");
  // Reemplazar espacios de no separación
  str = str.replace(/\u00A0/g, " ");
  // Eliminar espacios de ancho cero o marcas de orden de bytes
  str = str.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // Reemplazar cualquier otro carácter fuera de Latin-1 (WinAnsi: 0x20 a 0x7E y 0xA0 a 0xFF)
  str = str.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ");
  return str.trim();
}

/**
 * Divide y ajusta texto a un ancho máximo en milímetros de forma segura.
 * A diferencia del splitTextToSize nativo de jsPDF:
 * 1. Sanitiza caracteres Unicode incompatibles con la fuente WinAnsi.
 * 2. Parte palabras o códigos largos sin espacios (ej. 1.0.0.0.0.0.0.0.0.0 o 10000000000)
 *    carácter por carácter para que NUNCA desborden ni invadan columnas vecinas.
 * 3. Garantiza que toda línea resultante tenga un ancho <= safeWidth.
 *
 * @param {jsPDF} doc
 * @param {string} rawText
 * @param {number} maxWidth
 * @returns {string[]}
 */
export function wrapSafeText(doc, rawText, maxWidth) {
  if (rawText === null || rawText === undefined) return ["-"];
  const sanitized = sanitizePdfText(rawText);
  if (!sanitized) return ["-"];

  const safeWidth = Math.max(maxWidth, 6);
  const paragraphs = sanitized.split(/\r?\n/);
  const resultLines = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (doc.getTextWidth(trimmed) <= safeWidth) {
      resultLines.push(trimmed);
      continue;
    }

    const rawWords = trimmed.split(/\s+/);
    const words = [];

    for (const word of rawWords) {
      if (doc.getTextWidth(word) <= safeWidth) {
        words.push(word);
      } else {
        // La palabra individual excede safeWidth: partir carácter a carácter
        let currentChunk = "";
        for (let i = 0; i < word.length; i++) {
          const testChunk = currentChunk + word[i];
          if (doc.getTextWidth(testChunk) <= safeWidth) {
            currentChunk = testChunk;
          } else {
            if (currentChunk) {
              words.push(currentChunk);
            }
            currentChunk = word[i];
          }
        }
        if (currentChunk) {
          words.push(currentChunk);
        }
      }
    }

    // Unir palabras respetando safeWidth
    let currentLine = "";
    for (const w of words) {
      if (!currentLine) {
        currentLine = w;
      } else {
        const testLine = currentLine + " " + w;
        if (doc.getTextWidth(testLine) <= safeWidth) {
          currentLine = testLine;
        } else {
          resultLines.push(currentLine);
          currentLine = w;
        }
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines.length > 0 ? resultLines : ["-"];
}

/**
 * Convierte un código de color hexadecimal (#RRGGBB o #RGB) a tupla RGB [r, g, b].
 *
 * @param {string} hex
 * @param {[number, number, number]} defaultRgb
 * @returns {[number, number, number]}
 */
export function hexToRgb(hex, defaultRgb = [37, 99, 235]) {
  if (!hex || typeof hex !== "string") return defaultRgb;
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) return defaultRgb;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return defaultRgb;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Dibuja el icono vectorial de jerarquía / organigrama (mdi-sitemap)
 * con color institucional dinámico en jsPDF.
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {[number, number, number]} rgb
 */
export function drawSitemapIcon(doc, x, y, [r, g, b]) {
  doc.setFillColor(r, g, b);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.22);

  // 1. Nodo raíz superior (rectángulo pequeño centrado)
  doc.roundedRect(x + 0.9, y, 1.0, 0.75, 0.15, 0.15, "F");

  // 2. Conector vertical hacia abajo desde el nodo raíz
  doc.line(x + 1.4, y + 0.75, x + 1.4, y + 1.35);

  // 3. Barra horizontal de distribución (une rama izquierda, central y derecha)
  doc.line(x + 0.35, y + 1.35, x + 2.45, y + 1.35);

  // 4. Tres bajantes verticales hacia las subunidades
  doc.line(x + 0.35, y + 1.35, x + 0.35, y + 1.75);
  doc.line(x + 1.4, y + 1.35, x + 1.4, y + 1.75);
  doc.line(x + 2.45, y + 1.35, x + 2.45, y + 1.75);

  // 5. Tres nodos inferiores
  doc.roundedRect(x, y + 1.75, 0.7, 0.7, 0.15, 0.15, "F");
  doc.roundedRect(x + 1.05, y + 1.75, 0.7, 0.7, 0.15, 0.15, "F");
  doc.roundedRect(x + 2.1, y + 1.75, 0.7, 0.7, 0.15, 0.15, "F");
}

/**
 * Dibuja el icono vectorial de edificio institucional / unidad terminal (mdi-office-building)
 * con color institucional dinámico en jsPDF.
 *
 * @param {jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {[number, number, number]} rgb
 */
export function drawOfficeBuildingIcon(doc, x, y, [r, g, b]) {
  doc.setFillColor(r, g, b);
  doc.setDrawColor(r, g, b);

  // Cuerpo principal del edificio institucional (centrado en el ancho de 2.8mm)
  doc.roundedRect(x + 0.3, y, 2.2, 2.45, 0.2, 0.2, "F");

  // Ventanas caladas en blanco (2 columnas x 2 filas)
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 0.65, y + 0.4, 0.5, 0.4, "F");
  doc.rect(x + 1.65, y + 0.4, 0.5, 0.4, "F");
  doc.rect(x + 0.65, y + 1.05, 0.5, 0.4, "F");
  doc.rect(x + 1.65, y + 1.05, 0.5, 0.4, "F");

  // Puerta de entrada en la base
  doc.rect(x + 1.15, y + 1.75, 0.5, 0.7, "F");
}

/**
 * Dibuja el icono apropiado para una unidad (sitemap para unidades con ramas o edificio para hojas),
 * respetando el color de su clase o configuración.
 *
 * @param {jsPDF} doc
 * @param {Object} item
 * @param {number} x
 * @param {number} y
 * @param {Function} [resolveColor]
 */
export function drawMofUnitIcon(doc, item, x, y, resolveColor) {
  let hexColor = item?.color;
  if (!hexColor && typeof resolveColor === "function") {
    hexColor = resolveColor(item?.clase);
  }
  const rgb = hexToRgb(hexColor, [59, 130, 246]);

  const hasChildren = Boolean(
    (item?.children && item.children.length > 0) ||
    item?.hasChildren ||
    item?._hasChildren
  );

  if (hasChildren) {
    drawSitemapIcon(doc, x, y, rgb);
  } else {
    drawOfficeBuildingIcon(doc, x, y, rgb);
  }
}

/**
 * Helper para crear un documento jsPDF con estilos base institucionales.
 *
 * @param {'p'|'portrait'|'l'|'landscape'} orientation
 * @returns {jsPDF}
 */
export function createBasePdf(orientation = "p") {
  return new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });
}

/**
 * Dibuja la cabecera institucional estándar de un reporte MOF.
 *
 * @param {jsPDF} doc
 * @param {Object} options
 * @param {string} options.title - Título principal del reporte
 * @param {string} [options.subtitle] - Subtítulo descriptivo
 * @param {Array<{label: string, value: string}>} [options.activeFilters] - Filtros activos aplicados
 * @param {number} [options.startY=14] - Posición Y inicial
 * @returns {number} Posición Y final después de dibujar la cabecera
 */
export function drawReportHeader(doc, { title, subtitle, activeFilters = [], startY = 14 }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let currentY = startY;

  // Franja decorativa superior
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 1.8, "F");
  currentY += 5;

  // Encabezado institucional
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text("UNIVERSIDAD MAYOR DE SAN ANDRÉS | SISTEMA MOF", marginX, currentY);

  const fechaStr = `Fecha de emisión: ${formatReportDate()}`;
  const fechaWidth = doc.getTextWidth(fechaStr);
  doc.setFont("helvetica", "normal");
  doc.text(fechaStr, pageWidth - marginX - fechaWidth, currentY);
  currentY += 6;

  // Título del reporte
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(sanitizePdfText(title).toUpperCase(), marginX, currentY);
  currentY += 5;

  // Subtítulo si existe
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(sanitizePdfText(subtitle), marginX, currentY);
    currentY += 5;
  }

  // Línea divisoria
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 4;

  // Bloque de Filtros Activos si existen
  const validFilters = (activeFilters || []).filter(
    (f) => f && f.value !== null && f.value !== undefined && String(f.value).trim() !== ""
  );

  if (validFilters.length > 0) {
    doc.setFillColor(241, 245, 249); // Slate 100
    const filterBoxHeight = 7;
    doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, filterBoxHeight, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59); // Slate 800
    let filterX = marginX + 3;
    doc.text("FILTROS ACTIVOS:", filterX, currentY + 4.5);
    filterX += doc.getTextWidth("FILTROS ACTIVOS:") + 3;

    doc.setFont("helvetica", "normal");
    const filterParts = validFilters.map((f) => `${sanitizePdfText(f.label)}: ${sanitizePdfText(f.value)}`);
    const filterText = filterParts.join("  |  ");
    const availableWidth = pageWidth - marginX - filterX - 2;
    const truncatedText = doc.splitTextToSize(filterText, availableWidth)[0] || filterText;
    doc.text(truncatedText, filterX, currentY + 4.5);

    currentY += filterBoxHeight + 4;
  } else {
    currentY += 2;
  }

  return currentY;
}

/**
 * Agrega numeración de páginas y pie institucional a todas las páginas del documento.
 *
 * @param {jsPDF} doc
 */
export function addReportFooters(doc) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const footerY = pageHeight - 8;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Línea de pie
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);

    // Texto izquierdo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("Sistema de Manual de Organización y Funciones (MOF) | Documento Generado Oficial", marginX, footerY);

    // Numeración derecha
    const pageStr = `Página ${i} de ${totalPages}`;
    const pageStrWidth = doc.getTextWidth(pageStr);
    doc.text(pageStr, pageWidth - marginX - pageStrWidth, footerY);
  }
}

/**
 * Motor de dibujo de tablas programáticas en jsPDF puro sin librerías externas.
 * Soporta ancho de columnas porcentual o fijo, salto de página automático,
 * repetición de cabeceras, ajuste multilínea, indentación milimétrica y colores de estado.
 *
 * @param {jsPDF} doc
 * @param {Object} options
 * @param {Array<{header: string, key?: string, width: number, align?: 'left'|'center'|'right', getter?: Function, indentGetter?: Function}>} options.columns
 * @param {Array<Object>} options.rows
 * @param {number} [options.startY]
 * @param {string} [options.title] - Título opcional de la tabla/sección
 * @param {Object} [options.headerOptions] - Datos para redibujar cabecera si salta de página
 * @returns {number} Posición Y final después de dibujar la tabla
 */
export function drawPurePdfTable(doc, {
  columns = [],
  rows = [],
  startY = 35,
  title = null,
  headerOptions = null,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const marginBottom = 15;
  let currentY = startY;

  // Ajustar anchos de columnas para que sumen exactamente el ancho disponible
  const tableWidth = pageWidth - marginX * 2;
  const totalSpecifiedWidth = columns.reduce((sum, col) => sum + (col.width || 20), 0);
  const normalizedColumns = columns.map((col) => ({
    ...col,
    calculatedWidth: ((col.width || 20) / totalSpecifiedWidth) * tableWidth,
  }));

  // Función interna para dibujar el encabezado de la tabla
  const drawTableHeader = (y) => {
    const headerHeight = 7;
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(marginX, y, tableWidth, headerHeight, "F");

    let colX = marginX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    normalizedColumns.forEach((col) => {
      const text = sanitizePdfText(col.header).toUpperCase();
      const padding = 2;
      let textX = colX + padding;
      if (col.align === "center") {
        textX = colX + col.calculatedWidth / 2 - doc.getTextWidth(text) / 2;
      } else if (col.align === "right") {
        textX = colX + col.calculatedWidth - doc.getTextWidth(text) - padding;
      }
      doc.text(text, textX, y + 4.8);
      colX += col.calculatedWidth;
    });

    return y + headerHeight;
  };

  // Título de la tabla si existe
  if (title) {
    if (currentY + 12 > pageHeight - marginBottom) {
      doc.addPage();
      currentY = headerOptions ? drawReportHeader(doc, headerOptions) : marginX;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(sanitizePdfText(title), marginX, currentY);
    currentY += 5;
  }

  // Dibujar encabezados iniciales
  currentY = drawTableHeader(currentY);

  // Si no hay datos
  if (!rows || rows.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, currentY, tableWidth, 9, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, currentY, tableWidth, 9, "S");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("No se encontraron registros con los filtros seleccionados.", marginX + 4, currentY + 6);
    return currentY + 12;
  }

  // Dibujar filas de datos
  rows.forEach((row, rowIndex) => {
    // 1. Extraer, formatear y envolver texto de cada celda de forma segura
    const cellData = normalizedColumns.map((col) => {
      let val = "";
      if (typeof col.getter === "function") {
        val = col.getter(row);
      } else if (col.key) {
        val = row[col.key];
      }
      const strVal = val === null || val === undefined ? "-" : String(val);

      const indentMm = typeof col.indentGetter === "function" ? Math.max(0, col.indentGetter(row) || 0) : 0;
      const maxIndent = Math.max(0, col.calculatedWidth - 25);
      const safeIndent = Math.min(indentMm, maxIndent);

      const iconSpace = typeof col.iconDrawer === "function" ? (col.iconWidth || 4.2) : 0;
      const paddingX = 2;
      const availableWidth = col.calculatedWidth - paddingX * 2 - safeIndent - iconSpace;

      // Asegurar medición con fuente normal 7.5pt
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const lines = wrapSafeText(doc, strVal, availableWidth);

      return { lines, safeIndent, iconSpace };
    });

    // 2. Calcular altura de la fila según la celda con más líneas
    const maxLines = Math.max(...cellData.map((c) => c.lines.length), 1);
    const lineHeight = 3.6;
    const rowHeight = Math.max(maxLines * lineHeight + 2.8, 6.5);

    // 3. Salto de página si excede el límite inferior
    if (currentY + rowHeight > pageHeight - marginBottom) {
      doc.addPage();
      currentY = headerOptions ? drawReportHeader(doc, headerOptions) : marginX;
      currentY = drawTableHeader(currentY);
    }

    // 4. Color de fondo alternado (zebra)
    if (rowIndex % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252); // Slate 50
    }
    doc.rect(marginX, currentY, tableWidth, rowHeight, "F");

    // 5. Borde inferior sutil
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + rowHeight, marginX + tableWidth, currentY + rowHeight);

    // 6. Dibujar texto y elementos de cada celda
    let colX = marginX;
    normalizedColumns.forEach((col, colIdx) => {
      const { lines, safeIndent, iconSpace } = cellData[colIdx];
      const paddingX = 2;
      const startTextY = currentY + 4.2;

      // Dibujar icono si está definido en la columna
      if (typeof col.iconDrawer === "function") {
        const iconX = colX + paddingX + safeIndent;
        const iconY = currentY + 1.75;
        col.iconDrawer(doc, row, iconX, iconY);
      }

      // Resetear tamaño de fuente
      doc.setFontSize(7.5);

      // Color y estilo tipográfico según tipo de columna
      if (col.key === "estado" || col.key === "oficial" || col.header.toLowerCase().includes("estado")) {
        const textVal = (lines[0] || "").toUpperCase();
        if (textVal.includes("OFICIAL") && !textVal.includes("NO")) {
          doc.setTextColor(22, 101, 52); // Verde bosque institucional
          doc.setFont("helvetica", "bold");
        } else {
          doc.setTextColor(100, 116, 139); // Gris slate
          doc.setFont("helvetica", "normal");
        }
      } else if (colIdx === 0 && (col.key === "codigo" || col.header.includes("CÓDIGO"))) {
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFont("helvetica", "normal");
      }

      lines.forEach((line, lineIdx) => {
        let textX = colX + paddingX + safeIndent + iconSpace;
        if (col.align === "center") {
          textX = colX + col.calculatedWidth / 2 - doc.getTextWidth(line) / 2;
        } else if (col.align === "right") {
          textX = colX + col.calculatedWidth - doc.getTextWidth(line) - paddingX;
        }
        doc.text(line, textX, startTextY + lineIdx * lineHeight);
      });

      colX += col.calculatedWidth;
    });

    currentY += rowHeight;
  });

  return currentY + 4;
}

// ============================================================================
// EXPORTADORES ESPECÍFICOS PARA LAS 4 VISTAS DEL MOF
// ============================================================================

/**
 * 1. Exportador PDF para DashboardEjecutivo.vue
 */
export function exportDashboardEjecutivoPdf({
  title = "Reporte Ejecutivo - Consolidado Institucional",
  resumen = {},
  agrupaciones = {},
  unidades = [],
  activeFilters = [],
  resolveClaseColor = (c) => "#3B82F6",
}) {
  const doc = createBasePdf("l"); // Landscape para tabla ancha
  const headerOptions = { title, activeFilters, subtitle: "Indicadores globales y listado filtrado de unidades administrativas" };

  let currentY = drawReportHeader(doc, headerOptions);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  // Tarjetas de Resumen KPI (Total + Agrupaciones)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("RESUMEN CONSOLIDADO DE INDICADORES", marginX, currentY);
  currentY += 4;

  // Dibujar bloques KPI horizontales
  const kpis = [
    { label: "UNIVERSO TOTAL DE UNIDADES", val: resumen.total ?? unidades.length, color: [30, 58, 138] },
    { label: "INSTANCIAS / CLASES", val: agrupaciones.clases?.items?.length ?? 0, color: [234, 88, 12] },
    { label: "NIVELES JERÁRQUICOS", val: agrupaciones.niveles?.items?.length ?? 0, color: [126, 34, 206] },
    { label: "TIPOS DE UNIDAD", val: agrupaciones.tipos?.items?.length ?? 0, color: [2, 132, 199] },
    { label: "RELACIONES", val: agrupaciones.relaciones?.items?.length ?? 0, color: [190, 24, 93] },
  ];

  const kpiWidth = (pageWidth - marginX * 2 - (kpis.length - 1) * 3) / kpis.length;
  const kpiHeight = 14;

  kpis.forEach((kpi, idx) => {
    const kpiX = marginX + idx * (kpiWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kpiX, currentY, kpiWidth, kpiHeight, 1.5, 1.5, "FD");

    // Barra superior de color
    doc.setFillColor(...kpi.color);
    doc.roundedRect(kpiX, currentY, kpiWidth, 1.8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 2, currentY + 5.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(String(kpi.val), kpiX + 2, currentY + 11.5);
  });

  currentY += kpiHeight + 6;

  // Tabla de Unidades con anchos balanceados para A4 Horizontal (269mm imprimible)
  const columns = [
    { header: "CÓDIGO", key: "codigo", width: 22, align: "left" },
    {
      header: "UNIDAD ADMINISTRATIVA",
      getter: (u) => u.nombre || u.denominacion || "-",
      iconDrawer: (doc, item, x, y) => {
        drawMofUnitIcon(doc, item, x, y, resolveClaseColor);
      },
      iconWidth: 4.2,
      width: 85,
      align: "left",
    },
    { header: "SIGLA", getter: (u) => u.sigla || "-", width: 28, align: "center" },
    { header: "TIPO DE INSTANCIA", getter: (u) => u.claseNombre || u.clase || "-", width: 42, align: "left" },
    { header: "NIVEL", getter: (u) => u.nivelNombre || u.nivel || "-", width: 32, align: "left" },
    { header: "RELACIÓN", getter: (u) => u.relacionNombre || u.relacion || "-", width: 38, align: "left" },
    { header: "ESTADO", getter: (u) => (u.isOficial ? "OFICIAL" : "NO OFICIAL"), width: 22, align: "center" },
  ];

  drawPurePdfTable(doc, {
    columns,
    rows: unidades,
    startY: currentY,
    title: `DETALLE DE UNIDADES ADMINISTRATIVAS (${unidades.length} REGISTROS)`,
    headerOptions,
  });

  addReportFooters(doc);
  doc.save("Reporte_Ejecutivo_MOF.pdf");
}

/**
 * 2. Exportador PDF para DashboardFacultativo.vue
 */
export function exportDashboardFacultativoPdf({
  title = "Dashboard Facultativo - Consolidado de Dependencias",
  unidadMadre = null,
  conteoDependientes = {},
  arbolDependencias = [],
  activeFilters = [],
  resolveClase = (c) => c,
  resolveClaseColor = (c) => "#3B82F6",
}) {
  const doc = createBasePdf("p"); // Portrait para lectura de árbol
  const headerOptions = {
    title,
    activeFilters,
    subtitle: unidadMadre ? `Unidad Principal: ${unidadMadre.nombre || unidadMadre.denominacion}` : "",
  };

  let currentY = drawReportHeader(doc, headerOptions);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  if (unidadMadre) {
    // Tarjeta destacada de la Unidad Madre
    doc.setFillColor(238, 242, 255); // Indigo 50
    doc.setDrawColor(199, 210, 254);
    const boxH = 16;
    doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, boxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202); // Indigo 700
    doc.text("UNIDAD MADRE SELECCIONADA:", marginX + 3, currentY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const codigoStr = unidadMadre.codigo ? `[${unidadMadre.codigo}] ` : "";
    const madreNombre = `${codigoStr}${unidadMadre.nombre || unidadMadre.denominacion}`;
    const truncatedMadre = doc.splitTextToSize(sanitizePdfText(madreNombre), pageWidth - marginX * 2 - 8)[0] || madreNombre;
    doc.text(truncatedMadre, marginX + 3, currentY + 11.5);

    currentY += boxH + 5;

    // Resumen de dependientes en cantidades
    const tipos = Object.entries(conteoDependientes);
    if (tipos.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("CANTIDAD DE UNIDADES DEPENDIENTES POR TIPO:", marginX, currentY);
      currentY += 4;

      const cardW = Math.min((pageWidth - marginX * 2 - (tipos.length - 1) * 3) / tipos.length, 45);
      tipos.forEach(([tipoName, count], idx) => {
        const cX = marginX + idx * (cardW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cX, currentY, cardW, 12, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        const truncatedTipo = doc.splitTextToSize(sanitizePdfText(tipoName.toUpperCase()), cardW - 3)[0];
        doc.text(truncatedTipo, cX + 2, currentY + 4.5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(49, 46, 129);
        doc.text(String(count), cX + 2, currentY + 10);
      });

      currentY += 16;
    }
  }

  // Tabla jerárquica de dependientes (182mm imprimible en A4 Portrait)
  const columns = [
    { header: "CÓDIGO", key: "codigo", width: 22, align: "left" },
    {
      header: "UNIDAD DEPENDIENTE",
      getter: (item) => {
        return item.nombre || item.denominacion || "-";
      },
      indentGetter: (item) => {
        const depth = Math.max(0, item.level ?? item._depth ?? 0);
        return depth * 3.5;
      },
      iconDrawer: (doc, item, x, y) => {
        drawMofUnitIcon(doc, item, x, y, resolveClaseColor);
      },
      iconWidth: 4.2,
      width: 98,
      align: "left",
    },
    { header: "SIGLA", getter: (item) => item.sigla || "-", width: 26, align: "center" },
    { header: "INSTANCIA", getter: (item) => resolveClase(item.clase) || "-", width: 36, align: "left" },
  ];

  drawPurePdfTable(doc, {
    columns,
    rows: arbolDependencias,
    startY: currentY,
    title: `ÁRBOL DE DEPENDENCIAS DIRECTAS E INDIRECTAS (${arbolDependencias.length} TOTAL)`,
    headerOptions,
  });

  addReportFooters(doc);
  doc.save("Reporte_Facultativo_MOF.pdf");
}

/**
 * 3. Exportador PDF para ListarUnidades.vue
 */
export function exportListarUnidadesPdf({
  title = "Listado de Unidades Administrativas",
  unidades = [],
  activeFilters = [],
  resolveClase = (c) => c,
  resolveNivel = (n) => n,
  resolveClaseColor = (c) => "#3B82F6",
  isOficialCheck = () => true,
}) {
  const doc = createBasePdf("l"); // Landscape para tabla de 6 columnas
  const headerOptions = { title, activeFilters, subtitle: "Relación general de unidades administrativas registradas en el MOF" };

  const currentY = drawReportHeader(doc, headerOptions);

  // Anchos balanceados para A4 Horizontal (269mm imprimible)
  const columns = [
    { header: "CÓDIGO", key: "codigo", width: 24, align: "left" },
    {
      header: "UNIDAD ADMINISTRATIVA",
      getter: (u) => u.display_name || u.nombre || u.denominacion || "-",
      iconDrawer: (doc, item, x, y) => {
        drawMofUnitIcon(doc, item, x, y, resolveClaseColor);
      },
      iconWidth: 4.2,
      width: 115,
      align: "left",
    },
    { header: "SIGLA", getter: (u) => u.sigla || "-", width: 30, align: "center" },
    { header: "JERARQUÍA / CLASE", getter: (u) => resolveClase(u.clase) || "-", width: 48, align: "left" },
    { header: "NIVEL", getter: (u) => resolveNivel(u.nivel) || "-", width: 30, align: "left" },
    { header: "ESTADO", getter: (u) => (isOficialCheck(u) ? "OFICIAL" : "NO OFICIAL"), width: 22, align: "center" },
  ];

  drawPurePdfTable(doc, {
    columns,
    rows: unidades,
    startY: currentY,
    title: `REGISTROS ENCONTRADOS (${unidades.length})`,
    headerOptions,
  });

  addReportFooters(doc);
  doc.save("Listado_Unidades_MOF.pdf");
}

/**
 * 4. Exportador PDF para TreeUnidades.vue
 */
export function exportTreeUnidadesPdf({
  title = "Estructura Organizacional - Árbol de Unidades",
  flatTreeRows = [],
  activeFilters = [],
  resolveClase = (c) => c,
  resolveNivel = (n) => n,
  resolveClaseColor = (c) => "#3B82F6",
  isOficialCheck = () => true,
}) {
  const doc = createBasePdf("l"); // Landscape para árbol con sangría milimétrica y metadatos
  const headerOptions = { title, activeFilters, subtitle: "Visualización jerárquica indentada de la estructura organizacional institucional" };

  const currentY = drawReportHeader(doc, headerOptions);

  // Anchos balanceados para A4 Horizontal (269mm imprimible)
  const columns = [
    { header: "CÓDIGO", key: "codigo", width: 24, align: "left" },
    {
      header: "JERARQUÍA Y DENOMINACIÓN",
      getter: (item) => {
        return item.nombre || item.denominacion || item.display_name || "-";
      },
      indentGetter: (item) => {
        const depth = Math.max(0, item._depth ?? item.depth ?? item.level ?? 0);
        return depth * 3.5;
      },
      iconDrawer: (doc, item, x, y) => {
        drawMofUnitIcon(doc, item, x, y, resolveClaseColor);
      },
      iconWidth: 4.2,
      width: 116,
      align: "left",
    },
    { header: "SIGLA", getter: (item) => item.sigla || "-", width: 30, align: "center" },
    { header: "INSTANCIA / CLASE", getter: (item) => resolveClase(item.clase) || "-", width: 46, align: "left" },
    { header: "NIVEL", getter: (item) => resolveNivel(item.nivel) || "-", width: 30, align: "left" },
    { header: "ESTADO", getter: (item) => (isOficialCheck(item) ? "OFICIAL" : "NO OFICIAL"), width: 23, align: "center" },
  ];

  drawPurePdfTable(doc, {
    columns,
    rows: flatTreeRows,
    startY: currentY,
    title: `NODOS ESTRUCTURALES DEL ÁRBOL (${flatTreeRows.length} REGISTROS)`,
    headerOptions,
  });

  addReportFooters(doc);
  doc.save("Arbol_Estructura_MOF.pdf");
}
