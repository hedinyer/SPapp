import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:spapp/data/contrato_renting_clausulas.dart';
import 'package:spapp/models/contrato_renting_form.dart';
import 'package:spapp/models/hoja_vida_form.dart';

class ContractPdfService {
  static pw.Font? _regularFont;
  static pw.Font? _boldFont;
  static Future<void>? _preloadFuture;

  static Future<void> preloadFonts() {
    return _preloadFuture ??= () async {
      await _regular();
      await _bold();
    }();
  }

  static Future<pw.Font> _regular() async {
    _regularFont ??= await PdfGoogleFonts.robotoRegular();
    return _regularFont!;
  }

  static Future<pw.Font> _bold() async {
    _boldFont ??= await PdfGoogleFonts.robotoBold();
    return _boldFont!;
  }

  static Future<Uint8List> generateHojaVidaPdf({
    required HojaVidaForm form,
    Uint8List? signatureBytes,
  }) async {
    try {
      final regular = await _regular();
      final bold = await _bold();
      final doc = pw.Document(
        theme: pw.ThemeData.withFont(base: regular, bold: bold),
      );
      final tipoLabel = form.tipoIdentificacion != null
          ? HojaVidaForm.labelTipoIdentificacion(form.tipoIdentificacion!)
          : '';
      final estadoLabel = form.estadoCivil != null
          ? HojaVidaForm.labelEstadoCivil(form.estadoCivil!)
          : '';

      doc.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.letter,
          margin: const pw.EdgeInsets.all(40),
          build: (context) => [
            pw.Center(
              child: pw.Text(
                'HOJA DE VIDA VENTA A CREDITO',
                style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.SizedBox(height: 16),
            _line('NUEVA _____ USADA ______'),
            _line(
              'FECHA: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
            ),
            _line('NOMBRE COMPLETO: ${form.nombreCompleto}'),
            _line(
              'TIPO IDENTIFICACION: PPT: ${tipoLabel == 'PPT' ? 'X' : '_'} '
              'C.C.: ${tipoLabel == 'C.C.' ? 'X' : '_'} '
              'P: ${tipoLabel == 'P' ? 'X' : '_'} C.V. ${tipoLabel == 'C.V.' ? 'X' : '_'} '
              'No. ${form.numeroIdentificacion}',
            ),
            _line('FECHA DE NACIMIENTO ${form.fechaNacimiento}'),
            _line('CELULAR\t${form.celular}'),
            _line('DIRECCION: ${form.direccion}\tBARRIO: ${form.barrio}'),
            _line('CORREO ELECTRONICO: ${form.correo}'),
            _line(
              'TRABAJA EN EMPRESA: SI ${form.trabajaEmpresa == true ? 'X' : '_'} '
              'NO ${form.trabajaEmpresa == false ? 'X' : '_'}',
            ),
            _line(
              'NOMBRE EMPRESA: ${form.nombreEmpresa}\tTELEFONO: ${form.telefonoEmpresa}',
            ),
            _line('DIRECCION ${form.direccionEmpresa}'),
            _line(
              'INDEPENDIENTE: ${form.independiente == true ? 'X' : '_'} '
              'HABILIDAD: ${form.habilidad}',
            ),
            _line(
              'ESTADO CIVIL: SOLTERO: ${estadoLabel == 'Soltero(a)' ? 'X' : '_'} '
              'CASADO: ${estadoLabel == 'Casado(a)' ? 'X' : '_'} '
              'UNION LIBRE: ${estadoLabel == 'Unión libre' ? 'X' : '_'}',
            ),
            _line(
              'NOMBRE CONYUGE: ${form.nombreConyuge}\tCELULAR: ${form.celularConyuge}',
            ),
            pw.SizedBox(height: 12),
            pw.Text(
              'REFERENCIAS FAMILIARES Ó PERSONALES',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            ),
            if (form.referencias.isNotEmpty)
              _line(
                'NOMBRE: ${form.referencias[0].nombre}\t'
                'CELULAR: ${form.referencias[0].celular}',
              ),
            if (form.referencias.length > 1)
              _line(
                'NOMBRE: ${form.referencias[1].nombre}\t'
                'CELULAR: ${form.referencias[1].celular}',
              ),
            pw.SizedBox(height: 12),
            _line('PLACA ASIGNADA: _____________________'),
            _line(
              'CHASIS: ______________ COLOR: ________________ REFERENCIA: ___________',
            ),
            _line('MODELO: ____________'),
            _line('VISITA DOMICILIARIA: ________________________________'),
            pw.SizedBox(height: 8),
            pw.Text('FORMA DE PAGO', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            _line(
              'CUOTA INICIAL \$__________ VISITA DOMICILIARIA \$ ________ '
              'FECHA: ___________',
            ),
            _line(
              'MEDIO EFECTIVO ___ NEQUI _____BANCOLOMBIA ___ DAVIPLATA __DAVIVIENDA',
            ),
            _line(
              'MEDIO PAGO-REFRENCIA ________ ____________ _________ _________________',
            ),
            _line(
              'VALOR CUOTA: \$ __________ TIEMPO: ________ '
              'MODALIDAD PAGO: ____________',
            ),
            _line(
              'OTRAS DEUDAS: ___________ CONCEPTO _____________PLAZO PAGO ___________',
            ),
            _line('COMISION: _______________________________'),
            _line('FECHA DE ENTREGA: ________________________'),
            if (signatureBytes != null) ...[
              pw.SizedBox(height: 24),
              pw.Text('FIRMA DEL SOLICITANTE:'),
              pw.SizedBox(height: 8),
              pw.Image(pw.MemoryImage(signatureBytes), height: 60),
            ],
          ],
        ),
      );

      return doc.save();
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('Hoja de vida PDF error: $error');
        debugPrint('$stackTrace');
      }
      throw ContractPdfException(
        'No se pudo generar la Hoja de Vida. Intenta de nuevo.',
      );
    }
  }

  static Future<Uint8List> generateContratoPdf({
    required ContratoRentingForm form,
    Uint8List? signatureBytes,
  }) async {
    try {
      final regular = await _regular();
      final bold = await _bold();
      final doc = pw.Document(
        theme: pw.ThemeData.withFont(base: regular, bold: bold),
      );
      final formData = ContratoRentingFormData(
        nombreContratante: form.nombreContratante,
        cedulaContratante: form.cedulaContratante,
        direccionNotificaciones: form.direccionNotificaciones,
        fechaFirmaDia: form.fechaFirmaDia,
        fechaFirmaMes: form.fechaFirmaMes,
        fechaFirmaAnio: form.fechaFirmaAnio,
      );

      final intro = ContratoRentingClausulas.renderIntro(formData);
      final widgets = <pw.Widget>[
        pw.Text(intro, style: const pw.TextStyle(fontSize: 9)),
        pw.SizedBox(height: 12),
      ];

      for (final block in ContratoRentingClausulas.blocks) {
        for (final clausula in block.clausulas) {
          widgets.add(
            pw.Text(
              clausula.titulo,
              style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
            ),
          );
          widgets.add(pw.SizedBox(height: 4));
          widgets.add(
            pw.Text(
              ContratoRentingClausulas.renderClausulaTexto(
                clausula.texto,
                formData,
              ),
              style: const pw.TextStyle(fontSize: 8),
            ),
          );
          widgets.add(pw.SizedBox(height: 8));
        }
      }

      widgets.addAll([
        pw.Text(
          ContratoRentingClausulas.firmaTemplate
              .replaceAll('[DIA]', form.fechaFirmaDia)
              .replaceAll('[MES]', form.fechaFirmaMes)
              .replaceAll('[ANIO]', form.fechaFirmaAnio)
              .replaceAll('[ANIO_NUM]', form.fechaFirmaAnio),
          style: const pw.TextStyle(fontSize: 9),
        ),
        pw.SizedBox(height: 16),
        pw.Text('EL CONTRATANTE'),
        pw.Text(form.nombreContratante),
        pw.Text('C.C. ${form.cedulaContratante}'),
        if (signatureBytes != null) ...[
          pw.SizedBox(height: 8),
          pw.Image(pw.MemoryImage(signatureBytes), height: 60),
        ],
      ]);

      doc.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.letter,
          margin: const pw.EdgeInsets.all(36),
          build: (context) => widgets,
        ),
      );

      return doc.save();
    } catch (error, stackTrace) {
      if (kDebugMode) {
        debugPrint('Contrato PDF error: $error');
        debugPrint('$stackTrace');
      }
      throw ContractPdfException(
        'No se pudo generar el contrato. Intenta de nuevo.',
      );
    }
  }

  static pw.Widget _line(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 6),
      child: pw.Text(text, style: const pw.TextStyle(fontSize: 10)),
    );
  }
}

class ContractPdfException implements Exception {
  const ContractPdfException(this.message);

  final String message;

  @override
  String toString() => message;
}
