import PagoForm from "./pago-form";

// Las server actions (OCR con tesseract) corren en la funcion de esta ruta.
export const maxDuration = 60;

export default function Page() {
  return <PagoForm />;
}
