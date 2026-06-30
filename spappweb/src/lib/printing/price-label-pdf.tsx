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
    canvas: {
      position: "relative",
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

function pageLayout(options: PriceLabelPrintOptions) {
  const w = options.pageWidthMm;
  const h = options.pageHeightMm;
  const rotate = options.rotationDeg === 90;

  if (!rotate) {
    return {
      pageSize: [mm(w), mm(h)] as [number, number],
      canvasStyle: { width: mm(w), height: mm(h) },
    };
  }

  return {
    pageSize: [mm(h), mm(w)] as [number, number],
    canvasStyle: {
      width: mm(w),
      height: mm(h),
      transform: `rotate(90deg) translate(0, -${mm(w)})`,
    },
  };
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
  const layout = pageLayout(options);

  return (
    <Document>
      {pages.map((slots, pageIndex) => (
        <Page key={pageIndex} size={layout.pageSize} style={styles.page}>
          <View style={[styles.canvas, layout.canvasStyle]}>
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
          </View>
        </Page>
      ))}
    </Document>
  );
}
