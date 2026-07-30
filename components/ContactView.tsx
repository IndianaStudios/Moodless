import { Mail, MessageCircleHeart } from 'lucide-react';
import PublicPageLayout from './PublicPageLayout';

const ContactView = () => (
  <PublicPageLayout
    eyebrow="ESTAMOS AQUÍ"
    title="Hablemos con calma."
    description="Para dudas sobre Moodless, tu cuenta o el tratamiento de datos, escríbenos. Leemos cada mensaje con atención."
    icon={<MessageCircleHeart size={22} />}
    pageTitle="Contacto"
  >
    <div className="mx-auto max-w-xl text-center">
      <div className="app-surface-raised rounded-[1.5rem] p-7 sm:p-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200"><Mail size={21} /></div>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em]">Escríbenos cuando lo necesites</h2>
        <p className="mt-3 text-sm leading-7 text-white/50">Puedes contactar con el responsable de Moodless para consultas generales, soporte, privacidad o ejercicio de tus derechos.</p>
        <a href="mailto:moodlessapp@gmail.com" className="button-shine mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0b0911] transition-transform hover:scale-[1.02] active:scale-[.97]"><Mail size={16} /> moodlessapp@gmail.com</a>
      </div>
      <p className="mt-6 text-xs leading-6 text-white/35">No incluyas información clínica sensible en el correo. Para cuestiones relacionadas con tu cuenta, utiliza la dirección vinculada a Moodless.</p>
    </div>
  </PublicPageLayout>
);

export default ContactView;
