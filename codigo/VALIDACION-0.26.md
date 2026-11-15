# Validación de Prestafin Terminal 0.26.0

15 de noviembre de 2026. Se conservan las funciones y cambios de las versiones 0.25 y 0.25.1.

- 247 pruebas automatizadas aprobadas: motor, aislamiento de cuentas, permanentes, canje, ausencia de nueva prueba Stripe, rechazo de Checkout antiguo y caducidad React sin refrescar el servidor.
- Comprobación de tipos y compilación aprobadas.
- Actualización de la instalación fija completada; 36 archivos verificados. SHA-256 de app.asar: `88ecdcbbc6ab29111b947b64f52aab5a391a3c04ab184dff214febabdf6fb949`.
- Pruebas reales con dos cuentas ficticias aisladas: contraseña, dos canjes simultáneos con una única activación, duración exacta de 30 días, rechazo del segundo canje, vencimiento conservado al iniciar sesión otra vez y bloqueo tras caducar. También se ejecutó contra Supabase el módulo nativo extraído de la instalación actual y se comparó con el código probado. No se incluyen credenciales, sesiones ni datos de clientes en esta documentación.
- Apertura nativa y comprobación gráfica completadas con perfil ficticio aislado: inicio de sesión, estado Pro, días restantes, fecha de caducidad y rechazo del segundo canje. El comprobador restaura la lectura virtual de Electron tras inspeccionar app.asar y utiliza un perfil nuevo en cada ejecución.
- Se comprueba la clase exacta de MyInvestor Value C y Cobas Large Cap P: 25 rentabilidades mensuales comunes en la descarga real consultada. No se garantizan otras clases o cobertura futura.
- Stripe live devuelve cero registros fiscales activos. No se alteran impuestos ni se realizan cargos. Los cobros están pendientes de completar esa configuración real del titular; PRESTAFIN30 funciona independientemente de ella.

El proceso de distribución valida la versión PE del instalador, el paquete, la ausencia de datos privados, su configuración pública y los hashes. La Release se crea como borrador y solo se publica después de completar las comprobaciones y verificar el archivo subido. El enlace web mantiene el nombre estable `Prestafin.Terminal.exe`.

- Instalador Windows 0.26.0 generado y extraído realmente. Su app.asar coincide byte a byte con la instalación fija comprobada. SHA-256 del instalador: `fbaf35127bf7fd3f6e21c71cc513e997889d858a53713540eba780a3ff23a41a`.
