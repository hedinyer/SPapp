import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  InventarioExportRow,
  InventarioExportSummary,
} from "@/lib/printing/inventario-export";

function formatCopPdf(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const PHOTO = 78;

const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingBottom: 40,
    paddingHorizontal: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    paddingHorizontal: 28,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
  },
  headerLogos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerLogo: {
    height: 34,
    maxWidth: 120,
    objectFit: "contain",
  },
  headerTitles: {
    alignItems: "flex-end",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  headerSub: {
    color: "#cbd5e1",
    fontSize: 8,
    marginTop: 2,
  },
  summary: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  th: {
    color: "#f8fafc",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: "#e2e8f0",
    minHeight: PHOTO + 8,
  },
  rowAlt: {
    backgroundColor: "#f8fafc",
  },
  colFoto: { width: PHOTO + 12 },
  colNombre: { width: "22%", paddingRight: 6 },
  colSku: { width: "10%" },
  colCat: { width: "14%" },
  colMoney: { width: "11%", textAlign: "right" },
  colStock: { width: "8%", textAlign: "center" },
  colMin: { width: "8%", textAlign: "center" },
  colEstado: { width: "9%", textAlign: "center" },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: 6,
    objectFit: "cover",
    backgroundColor: "#e2e8f0",
  },
  photoEmpty: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
  },
  nombre: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  cell: { fontSize: 8.5 },
  stockBajo: {
    color: "#b91c1c",
    fontFamily: "Helvetica-Bold",
  },
  badgeBajo: {
    marginTop: 2,
    fontSize: 7,
    color: "#b91c1c",
    fontFamily: "Helvetica-Bold",
  },
  estadoPill: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#64748b",
  },
});

export function InventarioPdfDoc({
  rows,
  summary,
  fechaLabel,
  empresa,
  garridoLogoSrc,
  beraLogoSrc,
  photoSrcById,
}: {
  rows: InventarioExportRow[];
  summary: InventarioExportSummary;
  fechaLabel: string;
  empresa: string;
  garridoLogoSrc: string;
  beraLogoSrc: string;
  photoSrcById: Record<number, string>;
}) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.headerLogos}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            <Image style={styles.headerLogo} src={garridoLogoSrc} />
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image style={styles.headerLogo} src={beraLogoSrc} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Inventario de tienda</Text>
            <Text style={styles.headerSub}>
              {empresa} · {fechaLabel}
            </Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Productos</Text>
            <Text style={styles.summaryValue}>{summary.productos}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Unidades</Text>
            <Text style={styles.summaryValue}>{summary.unidades}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Valor a costo</Text>
            <Text style={styles.summaryValue}>
              {formatCopPdf(summary.valorCosto)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Valor a venta</Text>
            <Text style={styles.summaryValue}>
              {formatCopPdf(summary.valorVenta)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Stock bajo</Text>
            <Text style={[styles.summaryValue, styles.stockBajo]}>
              {summary.stockBajo}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={[styles.th, styles.colFoto]}>Foto</Text>
          <Text style={[styles.th, styles.colNombre]}>Producto</Text>
          <Text style={[styles.th, styles.colSku]}>SKU</Text>
          <Text style={[styles.th, styles.colCat]}>Categoría</Text>
          <Text style={[styles.th, styles.colMoney]}>Costo</Text>
          <Text style={[styles.th, styles.colMoney]}>Venta</Text>
          <Text style={[styles.th, styles.colStock]}>Stock</Text>
          <Text style={[styles.th, styles.colMin]}>Mín.</Text>
          <Text style={[styles.th, styles.colEstado]}>Estado</Text>
        </View>

        {rows.map((row, i) => {
          const photo = photoSrcById[row.id];
          return (
            <View
              key={row.id}
              style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
              wrap={false}
            >
              <View style={styles.colFoto}>
                {photo ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image style={styles.photo} src={photo} />
                ) : (
                  <View style={styles.photoEmpty} />
                )}
              </View>
              <View style={styles.colNombre}>
                <Text style={styles.nombre}>{row.nombre}</Text>
                {row.stockBajo ? (
                  <Text style={styles.badgeBajo}>STOCK BAJO</Text>
                ) : null}
              </View>
              <Text style={[styles.cell, styles.colSku]}>{row.sku}</Text>
              <Text style={[styles.cell, styles.colCat]}>{row.categoria}</Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {formatCopPdf(row.costo)}
              </Text>
              <Text style={[styles.cell, styles.colMoney]}>
                {formatCopPdf(row.venta)}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.colStock,
                  ...(row.stockBajo ? [styles.stockBajo] : []),
                ]}
              >
                {row.stock}
              </Text>
              <Text style={[styles.cell, styles.colMin]}>{row.stockMinimo}</Text>
              <Text
                style={[
                  styles.estadoPill,
                  styles.colEstado,
                  { color: row.activo ? "#15803d" : "#64748b" },
                ]}
              >
                {row.estado}
              </Text>
            </View>
          );
        })}

        <View style={styles.footer} fixed>
          <Text>{empresa}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
