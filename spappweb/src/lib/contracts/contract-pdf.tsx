import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  blocks,
  renderFirma,
  renderIntro,
  renderClausulaTexto,
  type ContratoData,
} from "@/lib/contracts/contrato-renting-clausulas";
import {
  ESTADO_CIVIL_LABELS,
  parseHojaVidaForm,
  type HojaVidaFormData,
} from "@/lib/contracts/hoja-vida-schema";

const TIPO_PDF_CODE: Record<string, string> = {
  ppt: "PPT",
  cc: "CC",
  p: "PV",
  cv: "CV",
};

async function publicImage(file: string): Promise<{ data: Buffer; format: "png" | "jpg" }> {
  const data = await readFile(path.join(process.cwd(), "public", file));
  return { data, format: file.endsWith(".png") ? "png" : "jpg" };
}

const styles = StyleSheet.create({
  page: { paddingTop: 52, paddingBottom: 48, paddingHorizontal: 40, fontSize: 10 },
  pageContrato: { paddingTop: 52, paddingBottom: 48, paddingHorizontal: 36, fontSize: 9 },
  logo: { position: "absolute", top: 16, right: 40, height: 36, objectFit: "contain" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#616161",
  },
  title: { textAlign: "center", fontSize: 14, fontWeight: "bold", marginBottom: 16 },
  titleContrato: { textAlign: "center", fontSize: 12, fontWeight: "bold", marginBottom: 12 },
  line: { marginBottom: 6, fontSize: 10 },
  sectionTitle: { fontWeight: "bold", marginTop: 12, marginBottom: 4 },
  intro: { fontSize: 9, marginBottom: 12 },
  blockTitle: { fontSize: 10, fontWeight: "bold", marginTop: 6, marginBottom: 6 },
  clausulaTitulo: { fontSize: 9, fontWeight: "bold", marginBottom: 4 },
  clausulaTexto: { fontSize: 8, lineHeight: 1.4, marginBottom: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#bdbdbd", marginVertical: 8 },
  firma: { fontSize: 9, marginBottom: 16 },
  firmaRow: { flexDirection: "row" },
  firmaCol: { flex: 1, paddingRight: 24 },
  bold9: { fontSize: 9, fontWeight: "bold" },
  t9: { fontSize: 9 },
  t8: { fontSize: 8 },
  sigImg: { height: 50, marginTop: 8, objectFit: "contain" },
});

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>SOLUCIONES PINILLA S.A.S.</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
    </View>
  );
}

export async function generateHojaVidaPdf(args: {
  hoja: Record<string, unknown>;
  signatureDataUrl: string;
}): Promise<Buffer> {
  const form: HojaVidaFormData = parseHojaVidaForm(args.hoja);
  const logo = await publicImage("logos_login.jpeg");
  const now = new Date();
  const tipo = form.tipo_identificacion ? TIPO_PDF_CODE[form.tipo_identificacion] : "";
  const estado = form.estado_civil ? ESTADO_CIVIL_LABELS[form.estado_civil] : "";
  const x = (cond: boolean) => (cond ? "X" : "_");
  const ref0 = form.referencias[0];
  const ref1 = form.referencias[1];

  const Line = ({ children }: { children: string }) => (
    <Text style={styles.line}>{children}</Text>
  );

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Image style={styles.logo} src={logo} fixed />
        <Footer />
        <Text style={styles.title}>HOJA DE VIDA VENTA A CREDITO</Text>
        <Line>NUEVA _____ USADA ______</Line>
        <Line>{`FECHA: ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`}</Line>
        <Line>{`NOMBRE COMPLETO: ${form.nombre_completo}`}</Line>
        <Line>
          {`TIPO IDENTIFICACION: PPT: ${x(tipo === "PPT")} CC: ${x(tipo === "CC")} PV: ${x(tipo === "PV")} CV: ${x(tipo === "CV")} No. ${form.numero_identificacion}`}
        </Line>
        <Line>{`FECHA DE NACIMIENTO ${form.fecha_nacimiento}`}</Line>
        <Line>{`CELULAR    ${form.celular}`}</Line>
        <Line>{`DIRECCION: ${form.direccion}    BARRIO: ${form.barrio}`}</Line>
        <Line>{`CORREO ELECTRONICO: ${form.correo}`}</Line>
        <Line>
          {`TRABAJA EN EMPRESA: SI ${x(form.trabaja_empresa === true)} NO ${x(form.trabaja_empresa === false)}`}
        </Line>
        <Line>{`NOMBRE EMPRESA: ${form.nombre_empresa}    TELEFONO: ${form.telefono_empresa}`}</Line>
        <Line>{`DIRECCION ${form.direccion_empresa}`}</Line>
        <Line>{`INDEPENDIENTE: ${x(form.independiente === true)} HABILIDAD: ${form.habilidad}`}</Line>
        <Line>
          {`ESTADO CIVIL: SOLTERO: ${x(estado === "Soltero(a)")} CASADO: ${x(estado === "Casado(a)")} UNION LIBRE: ${x(estado === "Unión libre")}`}
        </Line>
        <Line>{`NOMBRE CONYUGE: ${form.nombre_conyuge}    CELULAR: ${form.celular_conyuge}`}</Line>
        <Text style={styles.sectionTitle}>REFERENCIAS FAMILIARES Ó PERSONALES</Text>
        {(ref0.nombre || ref0.celular) && (
          <Line>{`NOMBRE: ${ref0.nombre}    CELULAR: ${ref0.celular}`}</Line>
        )}
        {(ref1.nombre || ref1.celular) && (
          <Line>{`NOMBRE: ${ref1.nombre}    CELULAR: ${ref1.celular}`}</Line>
        )}
        <Line> </Line>
        <Line>PLACA ASIGNADA: _____________________</Line>
        <Line>CHASIS: ______________ COLOR: ________________ REFERENCIA: ___________</Line>
        <Line>MODELO: ____________</Line>
        <Line>VISITA DOMICILIARIA: ________________________________</Line>
        <Text style={styles.sectionTitle}>FORMA DE PAGO</Text>
        <Line>CUOTA INICIAL $__________ VISITA DOMICILIARIA $ ________ FECHA: ___________</Line>
        <Line>MEDIO EFECTIVO ___ NEQUI _____BANCOLOMBIA ___ DAVIPLATA __DAVIVIENDA</Line>
        <Line>MEDIO PAGO-REFRENCIA ________ ____________ _________ _________________</Line>
        <Line>VALOR CUOTA: $ __________ TIEMPO: ________ MODALIDAD PAGO: ____________</Line>
        <Line>OTRAS DEUDAS: ___________ CONCEPTO _____________PLAZO PAGO ___________</Line>
        <Line>COMISION: _______________________________</Line>
        <Line>FECHA DE ENTREGA: ________________________</Line>
        <View>
          <Text style={{ marginTop: 24 }}>FIRMA DEL SOLICITANTE:</Text>
          <Image style={{ height: 60, marginTop: 8, objectFit: "contain" }} src={args.signatureDataUrl} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}

export async function generateContratoPdf(args: {
  contrato: ContratoData;
  signatureDataUrl: string;
}): Promise<Buffer> {
  const { contrato } = args;
  const logo = await publicImage("logos_login.jpeg");
  const marisol = await publicImage("marisolpinilla.png");

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.pageContrato}>
        <Image style={styles.logo} src={logo} fixed />
        <Footer />
        <Text style={styles.titleContrato}>CONTRATO DE RENTING</Text>
        <Text style={styles.intro}>{renderIntro(contrato)}</Text>
        {blocks.map((block) => (
          <View key={block.title}>
            <Text style={styles.blockTitle}>{block.title}</Text>
            {block.clausulas.map((c) => (
              <View key={c.titulo} wrap={false}>
                <Text style={styles.clausulaTitulo}>{c.titulo}</Text>
                <Text style={styles.clausulaTexto}>
                  {renderClausulaTexto(c.texto, contrato)}
                </Text>
              </View>
            ))}
          </View>
        ))}
        <View style={styles.divider} />
        <Text style={styles.firma}>{renderFirma(contrato)}</Text>
        <View style={styles.firmaRow}>
          <View style={styles.firmaCol}>
            <Text style={styles.bold9}>LA PROPIETARIA</Text>
            <Text style={styles.t9}>MARISOL PINILLA RUEDA</Text>
            <Text style={styles.t8}>C.C. 37.547.626</Text>
            <Text style={styles.t8}>Representante legal</Text>
            <Text style={styles.t8}>SOLUCIONES PINILLA S.A.S.</Text>
            <Image style={styles.sigImg} src={marisol} />
          </View>
          <View style={styles.firmaCol}>
            <Text style={styles.bold9}>EL CONTRATANTE</Text>
            <Text style={styles.t9}>{contrato.nombreContratante}</Text>
            <Text style={styles.t8}>{`C.C. ${contrato.cedulaContratante}`}</Text>
            <Image style={styles.sigImg} src={args.signatureDataUrl} />
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
