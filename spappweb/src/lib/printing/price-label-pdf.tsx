import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { PriceLabelData } from "@/lib/printing/price-label";
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM } from "@/lib/printing/price-label";
import type { PriceLabelPrintOptions } from "@/lib/printing/price-label-print-options";
import {
  labelLeftMm,
  labelSlotsForPages,
  labelTopMm,
} from "@/lib/printing/price-label-print-options";

function mm(mmValue: number) {
  return mmValue * 2.834645669291;
}

function labelStyles(scale: number) {
  return StyleSheet.create({
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
      fontSize: 5 * scale,
      textAlign: "center",
      maxLines: 1,
    },
    barcode: {
      width: mm(26 * scale),
      height: mm(7 * scale),
      objectFit: "contain",
    },
    price: {
      fontSize: 7 * scale,
      fontWeight: "bold",
      textAlign: "center",
    },
  });
}

export function PriceLabelPdfDoc({
  data,
  barcodeSrc,
  options,
}: {
  data: PriceLabelData;
  barcodeSrc: string;
  options: PriceLabelPrintOptions;
}) {
  const styles = labelStyles(options.contentScale);
  const pages = labelSlotsForPages(options);

  return (
    <Document>
      {pages.map((slots, pageIndex) => (
        <Page
          key={pageIndex}
          size={[mm(options.pageWidthMm), mm(options.pageHeightMm)]}
          style={styles.page}
        >
          {slots.map((slot) => (
            <View
              key={`${pageIndex}-${slot}`}
              style={[
                styles.label,
                {
                  left: mm(labelLeftMm(options, slot)),
                  top: mm(labelTopMm(options)),
                },
              ]}
            >
              <Text style={styles.name}>{data.nombre}</Text>
              <Image src={barcodeSrc} style={styles.barcode} />
              <Text style={styles.price}>{data.precioFormatted}</Text>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
