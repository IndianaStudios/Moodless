import React, { useEffect } from 'react';
import { Shield, FileText, ArrowLeft } from 'lucide-react';

interface LegalViewProps {
  type: 'privacy' | 'terms';
  onBack: () => void;
}

const LegalView: React.FC<LegalViewProps> = ({ type, onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const isPrivacy = type === 'privacy';

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <header className="w-full flex justify-between items-center p-6 border-b border-white/5 sticky top-0 bg-slate-950/80 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-4 duration-500">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
          <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">Volver</span>
        </button>
        <div className="flex items-center gap-2">
          {isPrivacy ? <Shield className="text-purple-400" size={24} /> : <FileText className="text-blue-400" size={24} />}
          <span className="font-black text-xl tracking-tighter">
            {isPrivacy ? 'Privacidad' : 'Términos'}
          </span>
        </div>
        <div className="w-24" /> {/* Spacer */}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth w-full px-6 py-12">
        <article className="max-w-3xl mx-auto prose prose-invert prose-p:text-slate-400 prose-headings:text-white prose-a:text-purple-400 marker:text-purple-400 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {isPrivacy ? (
            <>
              <h1>Política de Privacidad</h1>
              <p><em>Última actualización: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</em></p>
              
              <p>En cumplimiento con el <strong>Reglamento (UE) 2016/679 (RGPD)</strong>, creemos que tus emociones son solo tuyas. Esta Política describe de manera transparente cómo manejamos tu información personal.</p>
              
              <h2>1. Identidad del Responsable del Tratamiento</h2>
              <p>El responsable legal del tratamiento de los datos es la persona física <strong>Indiana Sainz Palacios</strong>. Puedes contactar conmigo mediante el correo electrónico: <strong>moodless@gmail.com</strong>.</p>
              
              <h2>2. Finalidad y Base Legitimadora</h2>
              <p>Solo procesamos tus datos para ofrecerte el servicio de la aplicación: registrar diarios, mostrar estadísticas y recomendar juegos terapéuticos en pantalla. La base legal bajo la cual procesamos estos datos, incluyendo las anotaciones sobre de tu estado emocional (datos considerados sensibles), es tu <strong>consentimiento explícito</strong> al aceptar esta normativa durante el registro de tu cuenta.</p>
              
              <h2>3. Conservación de los Datos</h2>
              <p>Almacenaremos los datos en tu base de datos de usuario de manera indefinida, única y exclusivamente mientras decidas ser cliente de la aplicación. En el momento en el que pulses el botón "Borrar Cuenta" habilitado en los ajustes de tu Perfil, procederemos a la eliminación total e irreversible de todos tus registros diarios y de las credenciales, en cumplimiento del derecho a la supresión y al olvido.</p>
              
              <h2>4. Decisiones Automatizadas y Perfilado</h2>
              <p>Informamos que la aplicación utiliza rutinas e interfaces de programación (APIs) algorítmicas que analizan automáticamente la tendencia de tus anotaciones de estados de ánimo. Este perfilado se emplea <strong>únicamente</strong> como herramienta de auto-reflexión in-app (generando breves insights generativos) y no produce efectos jurídicos, médicos, ni de mercadotecnia en tu contra.</p>
              
              <h2>5. Transferencias Internacionales a Terceros</h2>
              <p>La base de datos en la nube que utilizamos está alojada en servidores de Google (Firebase) ubicados en <strong>Madrid, España (europe-southwest1)</strong>, cumpliendo con las pautas de residencia de datos europea. Sin embargo, para poder generar respuestas terapéuticas y analizar tu contexto mediante Inteligencia Artificial ("Psicólogo IA" y "Chat de Contexto"), los textos efímeros de tus entradas diarias y chats pueden viajar a servidores de nuestros proveedores <strong>Groq y OpenRouter</strong> ubicados fuera del Espacio Económico Europeo (EE.UU). Estas transferencias se realizan bajo el amparo del <strong>Marco de Privacidad de Datos UE‑EE.UU. (EU‑U.S. Data Privacy Framework)</strong> o, en su defecto, mediante la adhesión a <strong>Cláusulas Contractuales Tipo</strong> de la Comisión Europea, garantizando un nivel de protección equivalente al del RGPD.</p>
              <p>Aparte del análisis efímero mediante Inteligencia artificial, <strong>nunca vendemos ni cedemos tu base de datos a anunciantes u organismos de analítica de marketing comercial.</strong></p>

              <h2>6. Procesadores y Subprocesadores</h2>
              <p>Utilizamos los siguientes proveedores externos como encargados de tratamiento estrictamente para las funciones descritas:</p>
              <ul>
                <li><strong>Google Firebase:</strong> Hosting de infraestructura, autenticación y base de datos (Datos en reposo en región EU).</li>
                <li><strong>Groq / OpenRouter:</strong> Procesamiento de inferencia de IA para el análisis emocional y extracción de contexto (Acceso efímero sin retención de datos para entrenamiento).</li>
              </ul>

              <h2>7. Datos Recopilados en el Chat de Contexto</h2>
              <p>Al utilizar el "Chat de Contexto Emocional", procesamos información adicional que nos facilitas voluntariamente, como:</p>
              <ul>
                <li><strong>Contexto:</strong> Situaciones sociales, laborales o personales (ej. "trabajo", "familia").</li>
                <li><strong>Métricas de Energía e Intensidad:</strong> Datos derivados de tu discurso para generar estadísticas avanzadas.</li>
              </ul>
              <p>Estos datos se almacenan vinculados a tu cuenta con las mismas medidas de seguridad que tus registros SAM.</p>

              <h2>8. Seguridad de los Datos</h2>
              <p>Empleamos medidas técnicas e infraestructurales avanzadas para proteger tu intimidad. Esto incluye el <strong>cifrado de datos en tránsito</strong> mediante TLS/SSL, el uso de autenticación segura de Firebase y la implementación de reglas de seguridad a nivel de base de datos que impiden que cualquier persona ajena a ti (incluyendo los administradores) pueda leer tus diarios.</p>

              <h2>9. Tus Derechos como interesado</h2>
              <p>En cualquier momento puedes ejercer tus derechos de forma gratuita desde la misma aplicación (eliminando o actualizando tu usuario), o enviando un e-mail a la dirección del Responsable del Tratamiento. Tus derechos incluyen el <strong>acceso</strong> a tus datos, la <strong>rectificación</strong>, la <strong>supresión/olvido</strong>, la <strong>limitación de su tratamiento</strong> y la <strong>portabilidad</strong> de los mismos.</p>
              <p>Asimismo, tienes el <strong>derecho a retirar tu consentimiento en cualquier momento</strong>, sin que ello afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada (Artículo 7.3 del RGPD).</p>

              <h2>10. Política de Cookies y ePrivacy</h2>
              <p>Cumpliendo con la Directiva ePrivacy, informamos que Moodless utiliza únicamente <strong>tecnologías técnicas y esenciales</strong> para el mantenimiento de tu sesión (vía Firebase). No empleamos cookies de rastreo, ni píxeles de seguimiento ni herramientas analíticas intrusivas de terceros que monitoricen tu comportamiento fuera de la aplicación.</p>

              <h2>11. Menores de Edad</h2>
              <p>Nuestra aplicación está dirigida a personas de <strong>al menos 14 años de edad</strong>. El uso por parte de menores de 14 años está permitido <strong>únicamente bajo la supervisión y autorización previa</strong> de sus padres o tutores legales. Si detectamos registros de menores de 14 años que no cuenten con dicha autorización verificable, procederemos al borrado inmediato de su información para garantizar su protección.</p>

              <h2>12. Origen de los Datos</h2>
              <p>Todos los datos objeto de tratamiento son <strong>facilitados directamente por ti</strong>. Moodless no obtiene información sobre tu persona a través de fuentes externas, bases de datos de terceros ni integraciones ocultas (Artículo 14 del RGPD), garantizando que solo tú tienes el control de lo que compartes.</p>

              <h2>13. Autoridad de Control</h2>
              <p>Tienes en todo momento el derecho a presentar una reclamación sobre el tratamiento que realizamos de tus datos en la <strong>Agencia Española de Protección de Datos (AEPD)</strong> (www.aepd.es), autoridad competente y supervisora en la materia.</p>
            </>
          ) : (
            <>
              <h1>Términos de Servicio</h1>
              <p><em>Última actualización: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</em></p>
              
              <p>Al utilizar <strong>Moodless</strong>, aceptas someterte legalmente a estos Términos de Servicio. La aceptación se realiza de forma expresa mediante el marcado de la casilla de verificación obligatoria durante el proceso de registro ("clickwrap"). Por favor, léelos detenidamente junto a nuestra <strong>Política de Privacidad</strong> antes de comenzar tu viaje emocional con nosotros.</p>
              
              <h2>1. Identificación del Proveedor</h2>
              <p>El servicio Moodless es provisto por la persona física <strong>Indiana Sainz Palacios</strong>. Puedes contactar conmigo para cualquier duda legal o técnica en el correo electrónico: <strong>moodless@gmail.com</strong>.</p>

              <h2>2. Descripción del Servicio</h2>
              <p>Moodless es una plataforma digital diseñada para la <strong>auto-reflexión y el bienestar emocional</strong>. Ofrecemos herramientas de diario personal, visualización de estados de ánimo mediante juegos dinámicos ("Canvas Games") y análisis reflexivo potenciado por Inteligencia Artificial.</p>

              <h2>3. Condiciones de Uso y Comportamiento</h2>
              <p>Como usuario, te comprometes a hacer un uso lícito y ético de la aplicación. Queda estrictamente prohibido:</p>
              <ul>
                <li>Intentar vulnerar la seguridad de la plataforma o realizar ataques de denegación de servicio.</li>
                <li>Hacer uso de la aplicación para fines comerciales no autorizados por el titular.</li>
                <li>Utilizar bots o scripts automatizados que interfieran con la experiencia de otros usuarios o con el servicio de Inteligencia Artificial.</li>
              </ul>

              <h2>4. Propiedad Intelectual</h2>
              <p>Todos los elementos que componen Moodless —incluyendo el código fuente, diseño gráfico, logotipos, dinámicas de juegos Canvas, textos y la marca— son propiedad intelectual exclusiva de <strong>Indiana Sainz Palacios</strong> o de sus licenciantes. Queda prohibida la reproducción parcial o total, distribución o transformación de cualquier contenido sin autorización previa por escrito.</p>

              <h2>5. Cuentas y Responsabilidad</h2>
              <p>Para la persistencia de datos en la nube, es necesaria la creación de una cuenta. Eres el único responsable de la custodia de tus credenciales de acceso. Moodless no se hace responsable de las pérdidas de datos o accesos no autorizados derivados de una gestión negligente de la seguridad por parte del usuario en sus dispositivos personales.</p>

              <h2>6. Inteligencia Artificial y Contenidos Generativos</h2>
              <p>Las reflexiones y análisis emocionales son generados mediante modelos de lenguaje externos (Groq / OpenRouter). Aceptas que estos contenidos son automáticos y deben ser tomados como meras herramientas de apoyo para la introspección personal, no como verdades clínicas o asesoramiento profesional.</p>

              <h2>7. Limitación de Responsabilidad y Renuncia Médica</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 my-6">
                <strong>ADVERTENCIA MÉDICA:</strong> Moodless <strong>NO es un sustituto de la atención médica profesional</strong>. No somos profesionales de la salud mental ni prestamos servicios de diagnóstico psiquiátrico. Si experimentas una crisis o pensamientos de autolesión, contacta inmediatamente con los servicios oficiales de emergencia (como el 112 en la UE o el 911 en EE.UU.).
              </div>
              <p>En ningún caso Moodless será responsable de daños indirectos, incidentales o derivados de una interpretación errónea de los consejos generados por la IA o de la indisponibilidad temporal del servicio técnico.</p>

              <h2>8. Condiciones Económicas</h2>
              <p>Actualmente, Moodless ofrece sus servicios de manera <strong>totalmente gratuita</strong> para el usuario final. Nos reservamos el derecho de introducir planes de suscripción o funcionalidades de pago en el futuro, en cuyo caso se notificará con antelación y se actualizarán estos Términos de Servicio para detallar las nuevas condiciones de contratación.</p>

              <h2>9. Terminación y Cancelación</h2>
              <p>Puedes dejar de usar el servicio y eliminar tu cuenta de forma inmediata desde los ajustes de la aplicación. Al eliminar tu cuenta, todos tus registros personales se borrarán de forma permanente. Moodless se reserva el derecho de suspender o cancelar cuentas que incumplan gravemente estas condiciones.</p>

              <h2>10. Modificación de los Términos</h2>
              <p>Podemos actualizar estos Términos periódicamente. Te notificaremos cualquier cambio sustancial mediante un aviso destacado en la aplicación o vía correo electrónico. El uso continuado de la app tras la entrada en vigor implica la aceptación de los nuevos términos.</p>

              <h2>11. Ley Aplicable y Jurisdicción</h2>
              <p>Estos términos se rigen por la **legislación española**. Para cualquier disputa derivada de estos términos o del uso de Moodless, las partes se someten a la jurisdicción de los **Juzgados y Tribunales de España**, renunciando expresamente a cualquier otro fuero que pudiera corresponderles.</p>
            </>
          )}

          <div className="mt-16 text-center">
            <button 
              onClick={onBack}
              className="inline-flex items-center gap-2 bg-white text-slate-950 px-8 py-3 rounded-full font-bold active:scale-95 transition-transform"
            >
              He leído y entiendo
            </button>
          </div>
        </article>
      </main>
    </div>
  );
};

export default LegalView;
