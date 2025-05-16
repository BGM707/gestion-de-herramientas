
// Decorador de seguridad para métodos
function securityDecorator(target, name, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
        console.log(`Método ${name} ejecutándose con medidas de seguridad`);
        try {
            // Registrar intento de acceso
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Intento de acceso registrado`);
            
            // Verificar si hay intentos de inyección o XSS
            if (args.some(arg => typeof arg === 'string' && 
                (arg.includes('script') || arg.includes('<') || arg.includes('>') || 
                 arg.includes('--') || arg.includes('=')))) {
                throw new Error("Posible intento de inyección detectado");
            }
            
            return originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Error de seguridad en ${name}: ${error.message}`);
            throw error;
        }
    };
    
    return descriptor;
}

// Clase principal de autenticación
class AuthenticationManager {
    constructor() {
        // Credenciales predefinidas (en producción estarían en el servidor)
        this.validUsername = "benjamingonzalez197160551";
        this.validPasswordHash = this._hashPassword("Luis-Miguel-Exitos1997@");
        
        // Intentos fallidos
        this.failedAttempts = 0;
        this.maxFailedAttempts = 5;
        this.lockoutTime = 30 * 60 * 1000; // 30 minutos en milisegundos
        this.isLockedOut = false;
        this.lockoutEndTime = null;
        
        this._initEventListeners();
    }
    
    _initEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.attemptLogin();
        });
        
        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });
    }
    
    // Método para cifrar contraseña
    _hashPassword(password) {
        try {
            // Usar SHA-256 para el hash de la contraseña
            return CryptoJS.SHA256(password).toString();
        } catch (error) {
            console.error("Error al cifrar la contraseña:", error);
            throw new Error("Error en el proceso de cifrado");
        }
    }
    
    // Verificar si la cuenta está bloqueada
    _checkLockout() {
        if (!this.isLockedOut) return false;
        
        const currentTime = new Date().getTime();
        if (currentTime >= this.lockoutEndTime) {
            // Desbloquear la cuenta si ha pasado el tiempo
            this.isLockedOut = false;
            this.failedAttempts = 0;
            return false;
        }
        
        const remainingMinutes = Math.ceil((this.lockoutEndTime - currentTime) / (60 * 1000));
        swal("Cuenta bloqueada", `Demasiados intentos fallidos. Intente nuevamente en ${remainingMinutes} minutos.`, "error");
        return true;
    }
    
    @securityDecorator
    validateCredentials(username, password) {
        // Verificar bloqueo primero
        if (this._checkLockout()) return false;
        
        try {
            const hashedPassword = this._hashPassword(password);
            
            if (username === this.validUsername && hashedPassword === this.validPasswordHash) {
                this.failedAttempts = 0;
                return true;
            } else {
                this.failedAttempts++;
                
                // Bloquear la cuenta después de demasiados intentos fallidos
                if (this.failedAttempts >= this.maxFailedAttempts) {
                    this.isLockedOut = true;
                    this.lockoutEndTime = new Date().getTime() + this.lockoutTime;
                    
                    swal("Cuenta bloqueada", "Demasiados intentos fallidos. La cuenta ha sido bloqueada por 30 minutos.", "error");
                }
                
                return false;
            }
        } catch (error) {
            console.error("Error al validar credenciales:", error);
            swal("Error", "Ha ocurrido un error al validar las credenciales.", "error");
            return false;
        }
    }
    
    @securityDecorator
    attemptLogin() {
        try {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember').checked;
            
            // Validaciones básicas
            if (!username || !password) {
                swal("Campos incompletos", "Por favor ingrese usuario y contraseña", "warning");
                return;
            }
            
            // Intentar autenticar
            if (this.validateCredentials(username, password)) {
                // Guardar sesión si "recordar" está marcado
                if (rememberMe) {
                    // No almacenar la contraseña, solo un token de sesión
                    const sessionToken = CryptoJS.lib.WordArray.random(16).toString();
                    localStorage.setItem('sessionToken', sessionToken);
                    localStorage.setItem('username', username);
                } else {
                    // Usar sessionStorage para la sesión actual
                    const sessionToken = CryptoJS.lib.WordArray.random(16).toString();
                    sessionStorage.setItem('sessionToken', sessionToken);
                    sessionStorage.setItem('username', username);
                }
                
                swal({
                    title: "¡Bienvenido!",
                    text: `Acceso correcto. Bienvenido al sistema, ${username}`,
                    icon: "success",
                    button: "Continuar"
                }).then(() => {
                    // Redirigir al dashboard (en producción)
                    console.log("Redirigiendo al dashboard...");
                    // window.location.href = 'dashboard.html';
                });
            } else if (!this.isLockedOut) {
                const remainingAttempts = this.maxFailedAttempts - this.failedAttempts;
                swal("Acceso denegado", `Credenciales incorrectas. Intentos restantes: ${remainingAttempts}`, "error");
            }
        } catch (error) {
            console.error("Error durante el intento de login:", error);
            swal("Error", "Ha ocurrido un error inesperado. Por favor intente nuevamente más tarde.", "error");
        }
    }
    
    @securityDecorator
    handleForgotPassword() {
        swal({
            title: "Recuperar contraseña",
            text: "Ingrese su nombre de usuario para recibir instrucciones",
            content: "input",
            button: {
                text: "Enviar",
                closeModal: false,
            }
        })
        .then(username => {
            if (!username) throw null;
            
            // Simulación de envío de correo de recuperación
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(username);
                }, 1500);
            });
        })
        .then(username => {
            swal({
                title: "¡Correo enviado!",
                text: `Se han enviado instrucciones de recuperación a la dirección asociada con ${username}`,
                icon: "success"
            });
        })
        .catch(err => {
            if (err) {
                swal("Error", "No se pudo procesar su solicitud", "error");
            } else {
                swal.close();
            }
        });
    }
}

// Arreglar el uso de decoradores con una forma alternativa compatible
function applySecurityDecorator(target, methodName) {
    const originalMethod = target.prototype[methodName];
    
    target.prototype[methodName] = function(...args) {
        console.log(`Método ${methodName} ejecutándose con medidas de seguridad`);
        try {
            // Registrar intento de acceso
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Intento de acceso registrado`);
            
            // Verificar si hay intentos de inyección o XSS
            if (args.some(arg => typeof arg === 'string' && 
                (arg.includes('script') || arg.includes('<') || arg.includes('>') || 
                 arg.includes('--') || arg.includes('=')))) {
                throw new Error("Posible intento de inyección detectado");
            }
            
            return originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Error de seguridad en ${methodName}: ${error.message}`);
            throw error;
        }
    };
}

// Aplicar decoradores manualmente (ya que los decoradores nativos no son soportados por todos los navegadores)
applySecurityDecorator(AuthenticationManager, 'validateCredentials');
applySecurityDecorator(AuthenticationManager, 'attemptLogin');
applySecurityDecorator(AuthenticationManager, 'handleForgotPassword');

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.authManager = new AuthenticationManager();
        console.log("Sistema de autenticación inicializado correctamente");
    } catch (error) {
        console.error("Error al inicializar el sistema de autenticación:", error);
        swal("Error de inicialización", "No se pudo iniciar el sistema de autenticación. Por favor recargue la página.", "error");
    }
});