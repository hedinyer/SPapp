import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { PriceLabelData } from "@/lib/printing/price-label";
import {
  LABEL_GAP_MM,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MM,
  ROW_HEIGHT_MM,
  ROW_WIDTH_MM,
} from "@/lib/printing/price-label";

function mm(mmValue: number) {
  return mmValue * 2.834645669291;
}

const styles = StyleSheet.create({
  page: {
    padding: 0,
  },
  label: {
    position: "absolute",
    width: mm(LABEL_WIDTH_MM),
    height: mm(LABEL_HEIGHT_MM),
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 5,
    textAlign: "center",
    maxLines: 1,
  },
  barcode: {
    width: mm(26),
    height: mm(7),
    objectFit: "contain",
  },
  price: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export function PriceLabelPdfDoc({
  data,
  barcodeSrc,
  slot = 0,
}: {
  data: PriceLabelData;
  barcodeSrc: string;
  slot?: number;
}) {
  const leftMm = LABEL_GAP_MM + slot * (LABEL_WIDTH_MM + LABEL_GAP_MM);

  return (
    <Document>
      <Page
        size={[mm(ROW_WIDTH_MM), mm(ROW_HEIGHT_MM)]}
        style={styles.page}
      >
        <View
          style={[
            styles.label,
            { left: mm(leftMm), top: mm(LABEL_GAP_MM) },
          ]}
        >
          <Text style={styles.name}>{data.nombre}</Text>
          <Image src={barcodeSrc} style={styles.barcode} />
          <Text style={styles.price}>{data.precioFormatted}</Text>
        </View>
      </Page>
    </Document>
  );
}
