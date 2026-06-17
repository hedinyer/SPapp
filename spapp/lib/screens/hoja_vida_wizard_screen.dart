import 'package:flutter/material.dart';
import 'package:spapp/models/hoja_vida_form.dart';
import 'package:spapp/services/contract_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/utils/name_validation.dart';
import 'package:spapp/widgets/contract_form_widgets.dart';

class HojaVidaWizardScreen extends StatefulWidget {
  const HojaVidaWizardScreen({
    super.key,
    required this.contractId,
    required this.initialForm,
  });

  final String contractId;
  final HojaVidaForm initialForm;

  @override
  State<HojaVidaWizardScreen> createState() => _HojaVidaWizardScreenState();
}

class _HojaVidaWizardScreenState extends State<HojaVidaWizardScreen> {
  late HojaVidaForm _form;
  int _step = 0;
  bool _isSaving = false;
  final _formKey = GlobalKey<FormState>();
  final _textController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _form = widget.initialForm;
    _syncController();
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  List<_HojaVidaStep> get _steps {
    final steps = <_HojaVidaStep>[
      _HojaVidaStep.nombre,
      _HojaVidaStep.tipoId,
      _HojaVidaStep.numeroId,
      _HojaVidaStep.fechaNacimiento,
      _HojaVidaStep.celular,
      _HojaVidaStep.direccion,
      _HojaVidaStep.barrio,
      _HojaVidaStep.correo,
      _HojaVidaStep.trabajo,
    ];

    if (_form.trabajaEmpresa == true) {
      steps.addAll([
        _HojaVidaStep.nombreEmpresa,
        _HojaVidaStep.telefonoEmpresa,
        _HojaVidaStep.direccionEmpresa,
      ]);
    } else if (_form.trabajaEmpresa == false) {
      steps.addAll([_HojaVidaStep.independiente, _HojaVidaStep.habilidad]);
    }

    steps.add(_HojaVidaStep.estadoCivil);

    if (_form.estadoCivil == EstadoCivil.casado ||
        _form.estadoCivil == EstadoCivil.unionLibre) {
      steps.addAll([_HojaVidaStep.conyugeNombre, _HojaVidaStep.conyugeCelular]);
    }

    steps.addAll([_HojaVidaStep.referencia1, _HojaVidaStep.referencia2]);
    return steps;
  }

  _HojaVidaStep get _currentStep => _steps[_step];

  void _syncController() {
    _textController.text = switch (_currentStep) {
      _HojaVidaStep.nombre => _form.nombreCompleto,
      _HojaVidaStep.numeroId => _form.numeroIdentificacion,
      _HojaVidaStep.fechaNacimiento => _form.fechaNacimiento,
      _HojaVidaStep.celular => _form.celular,
      _HojaVidaStep.direccion => _form.direccion,
      _HojaVidaStep.barrio => _form.barrio,
      _HojaVidaStep.correo => _form.correo,
      _HojaVidaStep.nombreEmpresa => _form.nombreEmpresa,
      _HojaVidaStep.telefonoEmpresa => _form.telefonoEmpresa,
      _HojaVidaStep.direccionEmpresa => _form.direccionEmpresa,
      _HojaVidaStep.habilidad => _form.habilidad,
      _HojaVidaStep.conyugeNombre => _form.nombreConyuge,
      _HojaVidaStep.conyugeCelular => _form.celularConyuge,
      _HojaVidaStep.referencia1 => _form.referencias[0].nombre,
      _HojaVidaStep.referencia2 => _form.referencias[1].nombre,
      _ => '',
    };
  }

  void _applyTextValue(String value) {
    setState(() {
      _form = switch (_currentStep) {
        _HojaVidaStep.nombre => _form.copyWith(nombreCompleto: value),
        _HojaVidaStep.numeroId => _form.copyWith(numeroIdentificacion: value),
        _HojaVidaStep.fechaNacimiento => _form.copyWith(fechaNacimiento: value),
        _HojaVidaStep.celular => _form.copyWith(celular: value),
        _HojaVidaStep.direccion => _form.copyWith(direccion: value),
        _HojaVidaStep.barrio => _form.copyWith(barrio: value),
        _HojaVidaStep.correo => _form.copyWith(correo: value),
        _HojaVidaStep.nombreEmpresa => _form.copyWith(nombreEmpresa: value),
        _HojaVidaStep.telefonoEmpresa =>
          _form.copyWith(telefonoEmpresa: value),
        _HojaVidaStep.direccionEmpresa =>
          _form.copyWith(direccionEmpresa: value),
        _HojaVidaStep.habilidad => _form.copyWith(habilidad: value),
        _HojaVidaStep.conyugeNombre => _form.copyWith(nombreConyuge: value),
        _HojaVidaStep.conyugeCelular => _form.copyWith(celularConyuge: value),
        _HojaVidaStep.referencia1 => _form.copyWith(
            referencias: [
              _form.referencias[0].copyWith(nombre: value),
              _form.referencias[1],
            ],
          ),
        _HojaVidaStep.referencia2 => _form.copyWith(
            referencias: [
              _form.referencias[0],
              _form.referencias[1].copyWith(nombre: value),
            ],
          ),
        _ => _form,
      };
    });
  }

  Future<void> _saveDraft() async {
    await ContractService.saveHojaVidaDraft(
      contractId: widget.contractId,
      form: _form,
    );
  }

  bool _validateCurrentStep() {
    if (_currentStep == _HojaVidaStep.tipoId) {
      if (_form.tipoIdentificacion == null) {
        _showMessage('Elige un tipo de documento.');
        return false;
      }
      return true;
    }
    if (_currentStep == _HojaVidaStep.trabajo) {
      if (_form.trabajaEmpresa == null) {
        _showMessage('Responde si trabajas en una empresa.');
        return false;
      }
      return true;
    }
    if (_currentStep == _HojaVidaStep.independiente) {
      if (_form.independiente == null) {
        _showMessage('Indica si trabajas por tu cuenta.');
        return false;
      }
      return true;
    }
    if (_currentStep == _HojaVidaStep.estadoCivil) {
      if (_form.estadoCivil == null) {
        _showMessage('Elige tu estado civil.');
        return false;
      }
      return true;
    }
    if (_currentStep == _HojaVidaStep.referencia1) {
      final ref = _form.referencias[0];
      if (!isFullName(ref.nombre) || ref.celular.trim().length < 10) {
        _showMessage(
          'Completa nombre completo (3 palabras) y celular de la referencia.',
        );
        return false;
      }
      return true;
    }
    if (_currentStep == _HojaVidaStep.referencia2) {
      final ref = _form.referencias[1];
      if (!isFullName(ref.nombre) || ref.celular.trim().length < 10) {
        _showMessage(
          'Completa nombre completo (3 palabras) y celular de la segunda referencia.',
        );
        return false;
      }
      return true;
    }

    if (_formKey.currentState?.validate() != true) return false;
    _applyTextValue(_textController.text.trim());
    return true;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _goNext() async {
    if (!_validateCurrentStep()) return;

    setState(() => _isSaving = true);
    try {
      await _saveDraft();
      if (!mounted) return;

      if (_step >= _steps.length - 1) {
        Navigator.of(context).pop(_form);
        return;
      }

      setState(() {
        _step++;
        _syncController();
        _isSaving = false;
      });
    } catch (error) {
      if (mounted) {
        setState(() => _isSaving = false);
        _showMessage(error.toString());
      }
    }
  }

  void _goBack() {
    if (_step == 0) {
      Navigator.of(context).pop();
      return;
    }
    setState(() {
      _step--;
      _syncController();
    });
  }

  @override
  Widget build(BuildContext context) {
    final step = _currentStep;
    final total = _steps.length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        leading: IconButton(
          onPressed: _isSaving ? null : _goBack,
          icon: const Icon(Icons.arrow_back_rounded),
        ),
        title: Text('Hoja de Vida', style: AppTypography.headlineSm),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(36),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              0,
              AppSpacing.lg,
              AppSpacing.md,
            ),
            child: ContractProgressBar(current: _step + 1, total: total),
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Form(
                key: _formKey,
                child: _buildStepContent(step),
              ),
            ),
          ),
          ContractBottomActions(
            onPrimary: _goNext,
            primaryLabel: _step >= total - 1 ? 'Guardar' : 'Siguiente',
            onSecondary: _goBack,
            isLoading: _isSaving,
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent(_HojaVidaStep step) {
    return switch (step) {
      _HojaVidaStep.nombre => ContractStepShell(
          title: '¿Cómo te llamas completo?',
          subtitle:
              'Escribe tu nombre tal como aparece en tu documento: nombre, primer apellido y segundo apellido.',
          legalLabel: 'Hoja de Vida — NOMBRE COMPLETO',
          child: ContractTextField(
            controller: _textController,
            hint: 'Ej: Juan Pérez García',
            validator: validateFullName,
          ),
        ),
      _HojaVidaStep.tipoId => ContractStepShell(
          title: '¿Qué documento tienes?',
          subtitle: 'Elige una opción.',
          legalLabel: 'Hoja de Vida — TIPO IDENTIFICACION',
          child: ContractChoiceList<TipoIdentificacion>(
            options: TipoIdentificacion.values,
            labelBuilder: HojaVidaForm.labelTipoIdentificacion,
            selected: _form.tipoIdentificacion,
            onSelected: (v) => setState(() => _form = _form.copyWith(tipoIdentificacion: v)),
          ),
        ),
      _HojaVidaStep.numeroId => ContractStepShell(
          title: '¿Cuál es tu número de documento?',
          subtitle: 'Solo números, sin puntos ni espacios.',
          legalLabel: 'Hoja de Vida — No. IDENTIFICACION',
          child: ContractTextField(
            controller: _textController,
            keyboardType: TextInputType.number,
            hint: 'Ej: 1098765432',
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Escribe tu número' : null,
          ),
        ),
      _HojaVidaStep.fechaNacimiento => ContractStepShell(
          title: '¿Cuándo naciste?',
          subtitle: 'Escribe día, mes y año. Los / se agregan solos.',
          legalLabel: 'Hoja de Vida — FECHA DE NACIMIENTO',
          child: ContractDateField(
            controller: _textController,
            validator: validateBirthDate,
          ),
        ),
      _HojaVidaStep.celular => ContractStepShell(
          title: '¿Cuál es tu celular?',
          subtitle: '10 dígitos, el que usas todos los días.',
          legalLabel: 'Hoja de Vida — CELULAR',
          child: ContractTextField(
            controller: _textController,
            keyboardType: TextInputType.phone,
            hint: 'Ej: 3001234567',
            validator: (v) {
              if (v == null || v.trim().length < 10) {
                return 'Escribe un celular de 10 dígitos';
              }
              return null;
            },
          ),
        ),
      _HojaVidaStep.direccion => ContractStepShell(
          title: '¿Dónde vives?',
          subtitle: 'Calle, carrera, número, apartamento…',
          legalLabel: 'Hoja de Vida — DIRECCION',
          child: ContractTextField(
            controller: _textController,
            maxLines: 2,
            hint: 'Ej: Calle 45 #12-34',
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Escribe tu dirección' : null,
          ),
        ),
      _HojaVidaStep.barrio => ContractStepShell(
          title: '¿En qué barrio?',
          subtitle: 'El barrio donde vives.',
          legalLabel: 'Hoja de Vida — BARRIO',
          child: ContractTextField(
            controller: _textController,
            hint: 'Ej: La Concordia',
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Escribe tu barrio' : null,
          ),
        ),
      _HojaVidaStep.correo => ContractStepShell(
          title: '¿Cuál es tu correo?',
          subtitle: 'Donde te podamos escribir.',
          legalLabel: 'Hoja de Vida — CORREO ELECTRONICO',
          child: ContractTextField(
            controller: _textController,
            keyboardType: TextInputType.emailAddress,
            hint: 'Ej: nombre@correo.com',
            validator: (v) {
              if (v == null || !v.contains('@')) return 'Escribe un correo válido';
              return null;
            },
          ),
        ),
      _HojaVidaStep.trabajo => ContractStepShell(
          title: '¿Trabajas en una empresa?',
          subtitle: 'Responde con sinceridad, nos ayuda a conocerte.',
          legalLabel: 'Hoja de Vida — TRABAJA EN EMPRESA: SI / NO',
          child: ContractChoiceChips<bool>(
            options: const [true, false],
            labelBuilder: (v) => v ? 'Sí, trabajo en empresa' : 'No',
            selected: _form.trabajaEmpresa,
            onSelected: (v) => setState(() => _form = _form.copyWith(trabajaEmpresa: v)),
          ),
        ),
      _HojaVidaStep.nombreEmpresa => ContractStepShell(
          title: '¿Cómo se llama la empresa?',
          subtitle: 'Nombre completo del lugar donde trabajas.',
          legalLabel: 'Hoja de Vida — NOMBRE EMPRESA',
          child: ContractTextField(
            controller: _textController,
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Escribe el nombre' : null,
          ),
        ),
      _HojaVidaStep.telefonoEmpresa => ContractStepShell(
          title: 'Teléfono de la empresa',
          subtitle: 'Opcional, pero ayuda.',
          legalLabel: 'Hoja de Vida — TELEFONO (empresa)',
          child: ContractTextField(
            controller: _textController,
            keyboardType: TextInputType.phone,
          ),
        ),
      _HojaVidaStep.direccionEmpresa => ContractStepShell(
          title: 'Dirección de la empresa',
          subtitle: '¿Dónde queda?',
          legalLabel: 'Hoja de Vida — DIRECCION (empresa)',
          child: ContractTextField(
            controller: _textController,
            maxLines: 2,
          ),
        ),
      _HojaVidaStep.independiente => ContractStepShell(
          title: '¿Trabajas por tu cuenta?',
          subtitle: 'Por ejemplo: mensajero, vendedor ambulante, etc.',
          legalLabel: 'Hoja de Vida — INDEPENDIENTE',
          child: ContractChoiceChips<bool>(
            options: const [true, false],
            labelBuilder: (v) => v ? 'Sí, independiente' : 'No',
            selected: _form.independiente,
            onSelected: (v) => setState(() => _form = _form.copyWith(independiente: v)),
          ),
        ),
      _HojaVidaStep.habilidad => ContractStepShell(
          title: '¿A qué te dedicas?',
          subtitle: 'Cuéntanos tu oficio o actividad.',
          legalLabel: 'Hoja de Vida — HABILIDAD',
          child: ContractTextField(
            controller: _textController,
            hint: 'Ej: Mensajería, ventas…',
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Cuéntanos a qué te dedicas' : null,
          ),
        ),
      _HojaVidaStep.estadoCivil => ContractStepShell(
          title: '¿Cuál es tu estado civil?',
          subtitle: 'Elige la opción que te corresponda.',
          legalLabel: 'Hoja de Vida — ESTADO CIVIL',
          child: ContractChoiceChips<EstadoCivil>(
            options: EstadoCivil.values,
            labelBuilder: HojaVidaForm.labelEstadoCivil,
            selected: _form.estadoCivil,
            onSelected: (v) => setState(() => _form = _form.copyWith(estadoCivil: v)),
          ),
        ),
      _HojaVidaStep.conyugeNombre => ContractStepShell(
          title: 'Nombre de tu cónyuge o pareja',
          subtitle:
              'Nombre completo: nombre, primer apellido y segundo apellido.',
          legalLabel: 'Hoja de Vida — NOMBRE CONYUGE',
          child: ContractTextField(
            controller: _textController,
            hint: 'Ej: María López Rodríguez',
            validator: validateFullName,
          ),
        ),
      _HojaVidaStep.conyugeCelular => ContractStepShell(
          title: 'Celular de tu cónyuge o pareja',
          subtitle: '10 dígitos.',
          legalLabel: 'Hoja de Vida — CELULAR (cónyuge)',
          child: ContractTextField(
            controller: _textController,
            keyboardType: TextInputType.phone,
            validator: (v) {
              if (v == null || v.trim().length < 10) {
                return 'Escribe un celular de 10 dígitos';
              }
              return null;
            },
          ),
        ),
      _HojaVidaStep.referencia1 => _ReferenciaStep(
          key: const ValueKey('referencia-0'),
          index: 0,
          form: _form,
          onChanged: (refs) => setState(() => _form = _form.copyWith(referencias: refs)),
        ),
      _HojaVidaStep.referencia2 => _ReferenciaStep(
          key: const ValueKey('referencia-1'),
          index: 1,
          form: _form,
          onChanged: (refs) => setState(() => _form = _form.copyWith(referencias: refs)),
        ),
    };
  }
}

enum _HojaVidaStep {
  nombre,
  tipoId,
  numeroId,
  fechaNacimiento,
  celular,
  direccion,
  barrio,
  correo,
  trabajo,
  nombreEmpresa,
  telefonoEmpresa,
  direccionEmpresa,
  independiente,
  habilidad,
  estadoCivil,
  conyugeNombre,
  conyugeCelular,
  referencia1,
  referencia2,
}

class _ReferenciaStep extends StatefulWidget {
  const _ReferenciaStep({
    super.key,
    required this.index,
    required this.form,
    required this.onChanged,
  });

  final int index;
  final HojaVidaForm form;
  final ValueChanged<List<ReferenciaPersonal>> onChanged;

  @override
  State<_ReferenciaStep> createState() => _ReferenciaStepState();
}

class _ReferenciaStepState extends State<_ReferenciaStep> {
  late final TextEditingController _nombre;
  late final TextEditingController _celular;

  @override
  void initState() {
    super.initState();
    _nombre = TextEditingController(
      text: widget.form.referencias[widget.index].nombre,
    );
    _celular = TextEditingController(
      text: widget.form.referencias[widget.index].celular,
    );
  }

  @override
  void dispose() {
    _nombre.dispose();
    _celular.dispose();
    super.dispose();
  }

  void _update() {
    final refs = List<ReferenciaPersonal>.from(widget.form.referencias);
    refs[widget.index] = ReferenciaPersonal(
      nombre: _nombre.text.trim(),
      celular: _celular.text.trim(),
    );
    widget.onChanged(refs);
  }

  @override
  Widget build(BuildContext context) {
    return ContractStepShell(
      title: 'Referencia ${widget.index + 1}',
      subtitle:
          'Una persona que te conozca. Escribe su nombre completo: nombre, primer apellido y segundo apellido.',
      legalLabel: 'Hoja de Vida — REFERENCIAS FAMILIARES Ó PERSONALES',
      child: Column(
        children: [
          ContractTextField(
            controller: _nombre,
            label: 'Nombre completo',
            hint: 'Ej: Ana Gómez Martínez',
            onChanged: (_) => _update(),
          ),
          const SizedBox(height: AppSpacing.md),
          ContractTextField(
            controller: _celular,
            label: 'Celular',
            keyboardType: TextInputType.phone,
            onChanged: (_) => _update(),
          ),
        ],
      ),
    );
  }
}
