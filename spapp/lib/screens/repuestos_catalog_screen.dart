import 'package:flutter/material.dart';
import 'package:spapp/models/inventario_categoria.dart';
import 'package:spapp/models/inventario_producto.dart';
import 'package:spapp/models/moto_payment_calculator.dart';
import 'package:spapp/models/user_moto_compra.dart';
import 'package:spapp/services/inventario_service.dart';
import 'package:spapp/services/solicitud_taller_service.dart';
import 'package:spapp/theme/app_theme.dart';
import 'package:spapp/theme/responsive.dart';
import 'package:spapp/widgets/cart_badge.dart';
import 'package:spapp/widgets/quantity_stepper.dart';

class RepuestosCatalogScreen extends StatefulWidget {
  const RepuestosCatalogScreen({
    super.key,
    required this.userId,
    required this.compra,
  });

  final int userId;
  final UserMotoCompra compra;

  @override
  State<RepuestosCatalogScreen> createState() => _RepuestosCatalogScreenState();
}

class _RepuestosCatalogScreenState extends State<RepuestosCatalogScreen> {
  List<InventarioCategoria> _categorias = [];
  List<InventarioProducto> _productos = [];
  final Map<int, CarritoItem> _carrito = {};
  int? _categoriaId;
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _showCartSummary = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    final categorias = await InventarioService.fetchCategorias();
    final productos = await InventarioService.fetchProductos(
      categoriaId: _categoriaId,
    );
    if (!mounted) return;
    setState(() {
      _categorias = categorias;
      _productos = productos;
      _isLoading = false;
    });
  }

  int get _totalItems =>
      _carrito.values.fold(0, (sum, item) => sum + item.cantidad);

  int get _totalCarrito =>
      _carrito.values.fold(0, (sum, item) => sum + item.subtotal);

  void _setQuantity(InventarioProducto producto, int qty) {
    if (qty <= 0) {
      setState(() => _carrito.remove(producto.id));
      return;
    }
    if (qty > producto.stock) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay más stock disponible.')),
      );
      return;
    }
    setState(() {
      _carrito[producto.id] = CarritoItem(producto: producto, cantidad: qty);
    });
  }

  void _increment(InventarioProducto producto) {
    final current = _carrito[producto.id]?.cantidad ?? 0;
    _setQuantity(producto, current + 1);
  }

  void _decrement(InventarioProducto producto) {
    final current = _carrito[producto.id]?.cantidad ?? 0;
    _setQuantity(producto, current - 1);
  }

  Future<void> _submit() async {
    if (_carrito.isEmpty) return;
    setState(() => _isSubmitting = true);
    try {
      await SolicitudTallerService.createRepuestosSolicitud(
        userId: widget.userId,
        userMotoCompraId: widget.compra.id,
        items: _carrito.values.toList(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Solicitud de repuestos enviada. Te contactaremos pronto.'),
        ),
      );
      Navigator.of(context).pop(true);
    } on SolicitudTallerException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _scrollToCartSummary() {
    setState(() => _showCartSummary = !_showCartSummary);
  }

  @override
  Widget build(BuildContext context) {
    final horizontalPad = Responsive.horizontalPadding(context);

    return Scaffold(
      backgroundColor: AppColors.surfaceContainerLowest,
      appBar: AppBar(
        title: const Text('Solicitar repuestos'),
        backgroundColor: AppColors.surfaceContainerLowest,
        actions: [
          if (_totalItems > 0)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.md),
              child: CartBadge(
                count: _totalItems,
                child: IconButton(
                  tooltip: 'Ver carrito',
                  onPressed: _scrollToCartSummary,
                  icon: const Icon(Icons.shopping_bag_outlined),
                ),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                    children: [
                      _FilterChip(
                        label: 'Todos',
                        selected: _categoriaId == null,
                        onTap: () {
                          setState(() => _categoriaId = null);
                          _load();
                        },
                      ),
                      ..._categorias.map(
                        (c) => _FilterChip(
                          label: c.nombre,
                          selected: _categoriaId == c.id,
                          onTap: () {
                            setState(() => _categoriaId = c.id);
                            _load();
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _productos.isEmpty
                      ? const Center(child: Text('No hay productos disponibles.'))
                      : ListView.separated(
                          padding: EdgeInsets.fromLTRB(
                            horizontalPad,
                            AppSpacing.sm,
                            horizontalPad,
                            _totalItems > 0 ? 160 : AppSpacing.md,
                          ),
                          itemCount: _productos.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (context, index) {
                            final p = _productos[index];
                            final inCart = _carrito[p.id]?.cantidad ?? 0;
                            return _ProductTile(
                              producto: p,
                              inCart: inCart,
                              onIncrement: () => _increment(p),
                              onDecrement: () => _decrement(p),
                            );
                          },
                        ),
                ),
                if (_totalItems > 0)
                  _CartFooter(
                    totalItems: _totalItems,
                    uniqueProducts: _carrito.length,
                    totalPrice: _totalCarrito,
                    items: _carrito.values.toList(),
                    expanded: _showCartSummary,
                    isSubmitting: _isSubmitting,
                    onToggleExpand: _scrollToCartSummary,
                    onSubmit: _submit,
                    onDecrement: (producto) => _decrement(producto),
                    onIncrement: (producto) => _increment(producto),
                  ),
              ],
            ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.sm),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.producto,
    required this.inCart,
    required this.onIncrement,
    required this.onDecrement,
  });

  final InventarioProducto producto;
  final int inCart;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  @override
  Widget build(BuildContext context) {
    final imageUrl = producto.imagenUrl?.trim();
    final inCartActive = inCart > 0;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: inCartActive
            ? AppColors.surfaceContainerLow
            : AppColors.background,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border.all(
          color: inCartActive
              ? AppColors.primary.withValues(alpha: 0.35)
              : AppColors.outline.withValues(alpha: 0.15),
          width: inCartActive ? 1.5 : 1,
        ),
        boxShadow: inCartActive ? AppShadows.subtle : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: imageUrl != null && imageUrl.isNotEmpty
                ? Image.network(
                    imageUrl,
                    width: 72,
                    height: 72,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => _placeholder(),
                  )
                : _placeholder(),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  producto.nombre,
                  style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
                ),
                if (producto.sku.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    producto.sku,
                    style: AppTypography.labelSm.copyWith(
                      color: AppColors.outline,
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.xs),
                Text(
                  MotoPaymentCalculator.formatCop(producto.precio),
                  style: AppTypography.bodySm.copyWith(
                    color: AppColors.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Stock: ${producto.stock}',
                  style: AppTypography.bodySm.copyWith(color: AppColors.secondary),
                ),
                if (inCartActive) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Subtotal: ${MotoPaymentCalculator.formatCop(producto.precio * inCart)}',
                    style: AppTypography.labelSm.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          inCartActive
              ? QuantityStepper(
                  quantity: inCart,
                  max: producto.stock,
                  compact: true,
                  onIncrement: onIncrement,
                  onDecrement: onDecrement,
                )
              : _AddButton(onTap: onIncrement),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 72,
      height: 72,
      color: AppColors.surfaceContainerLow,
      child: const Icon(Icons.inventory_2_outlined, color: AppColors.outline),
    );
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.primary,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.sm + 2,
            vertical: AppSpacing.sm,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.add_rounded,
                size: 18,
                color: AppColors.onPrimary,
              ),
              const SizedBox(width: 4),
              Text(
                'Agregar',
                style: AppTypography.labelSm.copyWith(
                  color: AppColors.onPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartFooter extends StatelessWidget {
  const _CartFooter({
    required this.totalItems,
    required this.uniqueProducts,
    required this.totalPrice,
    required this.items,
    required this.expanded,
    required this.isSubmitting,
    required this.onToggleExpand,
    required this.onSubmit,
    required this.onDecrement,
    required this.onIncrement,
  });

  final int totalItems;
  final int uniqueProducts;
  final int totalPrice;
  final List<CarritoItem> items;
  final bool expanded;
  final bool isSubmitting;
  final VoidCallback onToggleExpand;
  final VoidCallback onSubmit;
  final void Function(InventarioProducto producto) onDecrement;
  final void Function(InventarioProducto producto) onIncrement;

  @override
  Widget build(BuildContext context) {
    final horizontalPad = Responsive.horizontalPadding(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: AppColors.background,
        border: Border(
          top: BorderSide(color: AppColors.outline.withValues(alpha: 0.2)),
        ),
        boxShadow: AppShadows.elevated,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (expanded) ...[
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(context).height * 0.35,
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.fromLTRB(
                    horizontalPad,
                    AppSpacing.md,
                    horizontalPad,
                    AppSpacing.sm,
                  ),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return _CartSummaryRow(
                      item: item,
                      onDecrement: () => onDecrement(item.producto),
                      onIncrement: () => onIncrement(item.producto),
                    );
                  },
                ),
              ),
              Divider(
                height: 1,
                color: AppColors.outline.withValues(alpha: 0.15),
              ),
            ],
            Padding(
              padding: EdgeInsets.fromLTRB(
                horizontalPad,
                AppSpacing.md,
                horizontalPad,
                AppSpacing.md,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  InkWell(
                    onTap: onToggleExpand,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                      child: Row(
                        children: [
                          CartBadge(
                            count: totalItems,
                            child: Container(
                              padding: const EdgeInsets.all(AppSpacing.sm),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceContainerLow,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: AppColors.outlineVariant),
                              ),
                              child: const Icon(
                                Icons.shopping_bag_outlined,
                                size: 20,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '$totalItems ${totalItems == 1 ? 'artículo' : 'artículos'} en carrito',
                                  style: AppTypography.labelMd.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  uniqueProducts == 1
                                      ? '1 referencia'
                                      : '$uniqueProducts referencias',
                                  style: AppTypography.bodySm.copyWith(
                                    color: AppColors.secondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            MotoPaymentCalculator.formatCop(totalPrice),
                            style: AppTypography.labelMd.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          AnimatedRotation(
                            turns: expanded ? 0.5 : 0,
                            duration: const Duration(milliseconds: 200),
                            child: Icon(
                              Icons.keyboard_arrow_up_rounded,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  FilledButton(
                    onPressed: isSubmitting ? null : onSubmit,
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text('Enviar solicitud ($totalItems)'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartSummaryRow extends StatelessWidget {
  const _CartSummaryRow({
    required this.item,
    required this.onDecrement,
    required this.onIncrement,
  });

  final CarritoItem item;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm + 2),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.producto.nombre,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.labelMd.copyWith(fontWeight: FontWeight.w600),
                ),
                Text(
                  MotoPaymentCalculator.formatCop(item.subtotal),
                  style: AppTypography.bodySm.copyWith(
                    color: AppColors.secondary,
                  ),
                ),
              ],
            ),
          ),
          QuantityStepper(
            quantity: item.cantidad,
            max: item.producto.stock,
            compact: true,
            onIncrement: onIncrement,
            onDecrement: onDecrement,
          ),
        ],
      ),
    );
  }
}
