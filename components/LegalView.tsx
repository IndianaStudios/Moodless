import React from 'react';
import { Shield, FileText, Cookie } from 'lucide-react';
import PublicPageLayout from './PublicPageLayout';
import Reveal from './Reveal';

interface LegalViewProps {
  type: 'privacy' | 'terms' | 'cookies';
  onBack: () => void;
}

const LegalView: React.FC<LegalViewProps> = ({ type, onBack }) => {
  const isPrivacy = type === 'privacy';
  const isTerms = type === 'terms';
  const page = isPrivacy
    ? { eyebrow: 'TU INFORMACIÓN, TU CONTROL', title: 'Política de Privacidad', description: 'Cómo cuidamos la información que decides compartir con Moodless.', icon: <Shield size={22} />, pageTitle: 'Política de Privacidad' }
    : isTerms
      ? { eyebrow: 'CLARIDAD DESDE EL PRINCIPIO', title: 'Términos y Condiciones', description: 'Las condiciones que hacen posible un espacio seguro y respetuoso para todos.', icon: <FileText size={22} />, pageTitle: 'Términos y Condiciones' }
      : { eyebrow: 'TRANSPARENCIA ESENCIAL', title: 'Política de Cookies', description: 'La información sobre las tecnologías técnicas necesarias para que Moodless funcione.', icon: <Cookie size={22} />, pageTitle: 'Política de Cookies' };

  return (
    <PublicPageLayout {...page} onBack={onBack}>
      <Reveal as="article" className="legal-copy mx-auto max-w-3xl text-[15px] leading-7 text-white/55">
          
          {isPrivacy ? (
            <>
              <h1>Política de Privacidad</h1>
              <p><em>Última actualización: Mayo de 2026 (v2.0.0)</em></p>
              
              <p>En cumplimiento con el <strong>Reglamento (UE) 2016/679 (RGPD)</strong>, creemos que tus emociones son solo tuyas. Esta Política describe de manera transparente cómo manejamos tu información personal.</p>
              
              <h2>1. Identidad del Responsable del Tratamiento</h2>
              <p>El responsable legal del tratamiento de los datos es la persona física <strong>Indiana Sainz Palacios</strong>. Puedes contactar conmigo mediante el correo electrónico: <strong>moodlessapp@gmail.com</strong>.</p>
              
              <h2>2. Finalidad y Base Legitimadora</h2>
              <p>Solo procesamos tus datos para ofrecerte el servicio de la aplicación: registrar diarios, mostrar estadísticas y recomendar juegos terapéuticos en pantalla. La base legal bajo la cual procesamos estos datos, incluyendo las anotaciones sobre de tu estado emocional (datos considerados sensibles), es tu <strong>consentimiento explícito</strong> al aceptar esta normativa durante el registro de tu cuenta.</p>
              
              <h2>3. Conservación de los Datos</h2>
              <p>Almacenaremos los datos en tu base de datos de usuario de manera indefinida, única y exclusivamente mientras decidas ser cliente de la aplicación. En el momento en el que pulses el botón "Borrar Cuenta" habilitado en los ajustes de tu Perfil, procederemos a la eliminación total e irreversible de todos tus registros diarios y de las credenciales, en cumplimiento del derecho a la supresión y al olvido.</p>
              
              <h2>4. Decisiones Automatizadas y Perfilado</h2>
              <p>Informamos que la aplicación utiliza rutinas e interfaces de programación (APIs) algorítmicas que analizan automáticamente la tendencia de tus anotaciones de estados de ánimo. Este perfilado se emplea <strong>únicamente</strong> como herramienta de auto-reflexión in-app (generando breves insights generativos) y no produce efectos jurídicos, médicos, ni de mercadotecnia en tu contra.</p>
              
              <h2>5. Transferencias Internacionales a Terceros</h2>
              <p>La base de datos en la nube que utilizamos está alojada en servidores de Google (Firebase) ubicados en <strong>Madrid, España (europe-southwest1)</strong>, cumpliendo con las pautas de residencia de datos europea. Sin embargo, para poder generar respuestas terapéuticas y analizar tu contexto mediante Inteligencia Artificial ("Psicólogo IA" y "Chat de Contexto"), los textos efímeros de tus entradas diarias y chats pueden viajar a servidores de nuestros proveedores <strong>Google (Gemini), Mistral AI y Groq</strong> ubicados fuera del Espacio Económico Europeo (EE.UU.). Estas transferencias se realizan bajo el amparo del <strong>Marco de Privacidad de Datos UE‑EE.UU. (EU‑U.S. Data Privacy Framework)</strong> o, en su defecto, mediante la adhesión a <strong>Cláusulas Contractuales Tipo</strong> de la Comisión Europea, garantizando un nivel de protección equivalente al del RGPD.</p>
              <p>Aparte del análisis efímero mediante Inteligencia artificial, <strong>nunca vendemos ni cedemos tu base de datos a anunciantes u organismos de analítica de marketing comercial.</strong></p>

              <h2>6. Procesadores y Subprocesadores</h2>
              <p>Utilizamos los siguientes proveedores externos como encargados de tratamiento estrictamente para las funciones descritas:</p>
              <ul>
                <li><strong>Google Firebase:</strong> Hosting de infraestructura, autenticación y base de datos (Datos en reposo en región EU).</li>
                <li><strong>Google (Gemini) / Mistral AI / Groq:</strong> Procesamiento de inferencia de IA para el análisis emocional y extracción de contexto (Acceso efímero sin retención de datos para entrenamiento).</li>
              </ul>

              <h2>7. Datos Recopilados en el Chat de Contexto</h2>
              <p>Al utilizar el "Chat de Contexto Emocional", procesamos información adicional que nos facilitas voluntariamente, como:</p>
              <ul>
                <li><strong>Contexto:</strong> Situaciones sociales, laborales o personales (ej. "trabajo", "familia").</li>
                <li><strong>Métricas de Energía e Intensidad:</strong> Datos derivados de tu discurso para generar estadísticas avanzadas.</li>
              </ul>
              <p>Estos datos se almacenan vinculados a tu cuenta para que MoodBuddy pueda ofrecerte misiones personalizadas y para que el Informe de Aura Global pueda explicar tus niveles SAM en relación con tu vida real.</p>

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
          ) : isTerms ? (
            <>
              <h1>Términos y Condiciones del Servicio</h1>
              <p><em>Última actualización: Mayo de 2026 (v2.0.0)</em></p>
              
              <p>Al utilizar <strong>Moodless</strong>, aceptas someterte legalmente a estos Términos y Condiciones. La aceptación se realiza de forma expresa mediante el marcado de la casilla de verificación obligatoria durante el proceso de registro ("clickwrap"). Por favor, léelos detenidamente junto a nuestra <strong>Política de Privacidad</strong> antes de comenzar tu viaje emocional con nosotros.</p>
              
              <h2>1. Identificación del Proveedor</h2>
              <p>El servicio Moodless es provisto por la persona física <strong>Indiana Sainz Palacios</strong>. Puedes contactar conmigo para cualquier duda legal o técnica en el correo electrónico: <strong>moodlessapp@gmail.com</strong>.</p>

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
              <p>Las reflexiones y análisis emocionales son generados mediante modelos de lenguaje externos (Google Gemini / Mistral AI / Groq). Aceptas que estos contenidos son automáticos y deben ser tomados como meras herramientas de apoyo para la introspección personal, no como verdades clínicas o asesoramiento profesional.</p>

              <h2>7. Limitación de Responsabilidad y Renuncia Médica</h2>
              <div className="app-surface border-red-500/20 rounded-xl p-4 my-6">
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
          ) : (
            <>
              <h2>1. Qué son las cookies</h2>
              <p>Las cookies son pequeños archivos que el navegador guarda en tu dispositivo. Sirven para recordar información técnica necesaria para que un sitio web pueda funcionar de forma segura y coherente.</p>

              <h2>2. Cookies y tecnologías que utiliza Moodless</h2>
              <p>Moodless utiliza únicamente tecnologías técnicas y esenciales relacionadas con la autenticación, la seguridad y la prestación del servicio. En particular, Firebase puede emplear mecanismos de sesión para mantener tu acceso autenticado y proteger la aplicación frente a usos indebidos.</p>

              <h2>3. Finalidad</h2>
              <ul>
                <li><strong>Sesión y autenticación:</strong> permitir que accedas a tu cuenta y conservar tu sesión de forma segura.</li>
                <li><strong>Seguridad:</strong> prevenir fraude, abuso y accesos no autorizados.</li>
                <li><strong>Funcionamiento:</strong> recordar las preferencias técnicas imprescindibles para utilizar Moodless.</li>
              </ul>

              <h2>4. Lo que no hacemos</h2>
              <p>No utilizamos cookies publicitarias, píxeles de seguimiento, perfiles comerciales ni herramientas de analítica invasiva para seguirte dentro o fuera de Moodless. Tampoco vendemos ni compartimos información obtenida a través de estas tecnologías para fines de marketing.</p>

              <h2>5. Gestión desde tu navegador</h2>
              <p>Puedes eliminar o bloquear cookies desde la configuración de tu navegador. Ten en cuenta que, si bloqueas las cookies estrictamente necesarias, es posible que no puedas iniciar sesión o utilizar determinadas funciones de Moodless correctamente.</p>

              <h2>6. Cambios en esta política</h2>
              <p>Si incorporamos tecnologías no esenciales o modificamos de forma relevante esta política, actualizaremos esta página antes de aplicarlas y, cuando corresponda, solicitaremos tu consentimiento.</p>

              <h2>7. Contacto</h2>
              <p>Para cualquier consulta sobre esta política, puedes escribir a <a href="mailto:moodlessapp@gmail.com">moodlessapp@gmail.com</a>.</p>
            </>
          )}

          <div className="mt-16 text-center">
            <button
              type="button"
              onClick={onBack}
              className="app-button app-button-primary px-8 py-3"
            >
              He leído y entiendo
            </button>
          </div>
      </Reveal>
    </PublicPageLayout>
  );
};

export default LegalView;
