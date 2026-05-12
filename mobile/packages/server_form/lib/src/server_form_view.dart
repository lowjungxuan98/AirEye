import 'package:core/core.dart';
import 'package:flutter/services.dart';

import 'server_form_result.dart';
import 'widgets/server_form_field.dart';

class ServerFormView extends BaseStatefulPage {
  const ServerFormView({super.key});

  @override
  BasePageState<ServerFormView> createState() => _ServerFormViewState();
}

class _ServerFormViewState extends BasePageState<ServerFormView> {
  final _formKey = GlobalKey<FormState>();
  final _hostCtrl = TextEditingController();
  final _portCtrl = TextEditingController(text: '22');
  final _userCtrl = TextEditingController();
  final _credCtrl = TextEditingController();
  bool _useKey = false;

  @override
  void dispose() {
    _hostCtrl.dispose();
    _portCtrl.dispose();
    _userCtrl.dispose();
    _credCtrl.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    Navigator.of(context).pop(
      ServerFormResult(
        host: _hostCtrl.text.trim(),
        port: int.parse(_portCtrl.text.trim()),
        username: _userCtrl.text.trim(),
        credential: _credCtrl.text,
        useKey: _useKey,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Server'),
        leading: const GrimBackButton(),
        actions: [TextButton(onPressed: _save, child: const Text('Save'))],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ServerFormField(
              controller: _hostCtrl,
              label: 'Host',
              hint: '192.168.1.100',
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            ServerFormField(
              controller: _portCtrl,
              label: 'Port',
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            ServerFormField(
              controller: _userCtrl,
              label: 'Username',
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              title: const Text('Use SSH key'),
              value: _useKey,
              onChanged: (v) => setState(() => _useKey = v),
            ),
            const SizedBox(height: 4),
            ServerFormField(
              controller: _credCtrl,
              label: _useKey ? 'Private Key' : 'Password',
              maxLines: _useKey ? 5 : 1,
              obscureText: !_useKey,
              validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
            ),
          ],
        ),
      ),
    );
  }
}
