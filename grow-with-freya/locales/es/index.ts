export default {
  // Common UI elements
  common: {
    back: 'Volver',
    backArrow: '← Volver',
    next: 'Siguiente',
    done: 'Hecho',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    ok: 'OK',
    yes: 'Sí',
    no: 'No',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    retry: 'Reintentar',
    version: 'Versión',
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    notSet: 'No establecido',
  },

  // Main menu
  menu: {
    stories: 'Cuentos',
    emotions: 'Emociones',
    calming: 'Relajación',
  },

  // Story selection
  stories: {
    title: 'Cuentos',
    genreStories: 'Cuentos de {{genre}}',
    genres: {
      bedtime: 'Hora de dormir',
      adventure: 'Aventura',
      nature: 'Naturaleza',
      friendship: 'Amistad',
      learning: 'Aprendizaje',
      fantasy: 'Fantasía',
      personalized: 'Tu avatar, tu cuento',
      music: 'Aprende música',
      activities: 'Actividades espontáneas',
      growing: 'Creciendo juntos',
    },
    filterTags: {
      personalized: 'Tu cuento',
      calming: 'Relajante',
      bedtime: 'Hora de dormir',
      adventure: 'Aventura',
      learning: 'Aprendizaje',
      music: 'Música',
      family: 'Familia',
      imagination: 'Imaginación',
      animals: 'Animales',
      friendship: 'Amistad',
      nature: 'Naturaleza',
      fantasy: 'Fantasía',
      counting: 'Contar',
      emotions: 'Emociones',
      silly: 'Divertido',
      rhymes: 'Rimas',
    },
  },

  // Story reader
  reader: {
    tapToContinue: 'Toca para continuar',
    tapToBegin: 'Toca para comenzar',
    selectVoiceProfile: 'Selecciona un perfil de voz',
    recordingAs: 'Grabando como: {{name}}',
    listeningTo: 'Escuchando a: {{name}}',
    selectRecording: 'Selecciona una grabación',
    storyPagesNotAvailable: 'Páginas del cuento no disponibles',
    recordingComplete: 'Grabación completa',
    recordingCompleteMessage: 'Tu grabación de voz para "{{name}}" ha sido guardada.',
    page: 'Página {{current}} de {{total}}',
  },

  // Story completion
  completion: {
    theEnd: 'Fin',
    wellDone: '¡Muy bien!',
    readAnother: 'Leer otro cuento',
    rereadStory: 'Leer de nuevo',
    bedtimeMusic: 'Música para dormir',
    backToMenu: 'Volver al menú',
  },

  // Emotions screen
  emotions: {
    title: '¡Exprésate!',
    subtitle: 'Elige tu estilo y aprende sobre emociones',
    pickYourStyle: 'Elige tu estilo',
    howToPlay: 'Cómo jugar',
    howToPlayExpanded: 'Cómo jugar ▼',
    howToPlayCollapsed: 'Cómo jugar ▶',
    expressWithTheme: '¡Exprésate con {{theme}}!',
    instructions: {
      step1: 'Mira la imagen',
      step2: '¡Haz la misma cara!',
      step3: 'Muéstrame feliz, triste o tonto',
      step4: '¡Aprendamos juntos sobre los sentimientos!',
    },
  },

  // Music/Calming screen
  music: {
    title: 'Relajación',
    subtitle: 'Elige tu tipo de música',
    tantrums: 'Berrinches',
    tantrumsDescription: 'Música relajante para momentos difíciles',
    sleep: 'Dormir',
    sleepDescription: 'Sonidos suaves para un sueño tranquilo',
    unknownArtist: 'Artista desconocido',
  },

  // Account screen
  account: {
    title: 'Cuenta',
    profile: 'Perfil',
    nickname: 'Apodo',
    avatarType: 'Tipo de avatar',
    boy: '👦 Niño',
    girl: '👧 Niña',
    settings: 'Configuración',
    language: 'Idioma',
    textSize: 'Tamaño de texto',
    notifications: 'Notificaciones',
    screenTime: 'Tiempo de pantalla',
    customReminders: 'Recordatorios personalizados',
    legal: 'Legal',
    termsAndConditions: 'Términos y condiciones',
    privacyPolicy: 'Política de privacidad',
    selectLanguage: 'Seleccionar idioma',
    guestMode: 'Modo invitado',
    createAccount: 'Crea una cuenta para guardar tu progreso',
  },

  // Onboarding
  onboarding: {
    welcome: '¡Bienvenido!',
    letsGetStarted: 'Comencemos',
    whatsYourName: '¿Cómo te llamas?',
    enterNickname: 'Ingresa un apodo',
    chooseAvatar: 'Elige tu avatar',
    allSet: '¡Todo listo!',
    startExploring: 'Comenzar a explorar',
    screens: {
      welcome: {
        title: '¡Bienvenido!',
        body: 'Ayuda al desarrollo temprano de tu hijo con nuestras historias y actividades',
        button: 'Siguiente',
      },
      screenTime: {
        title: 'Por qué limitamos el tiempo de pantalla',
        body: 'Animamos a los padres a usar esta aplicación junto con su hijo.',
        button: 'Siguiente',
      },
      personalize: {
        title: '¡Hagámoslo sobre ellos!',
        body: '¿Cuál es tu nombre? ¡Personaliza la experiencia ingresando tu nombre y creando un avatar!',
        button: 'Siguiente',
      },
      voiceRecording: {
        title: '¡Graba tu voz!',
        body: 'Narra tus historias con tu voz. Consuela a tu hijo mientras no estás.',
        button: 'Siguiente',
      },
      research: {
        title: '¡Respaldado por investigación!',
        body: 'Esta aplicación se desarrolla como parte de un estudio de maestría sobre desarrollo infantil, explorando cómo los ejercicios digitales pueden apoyar una relación saludable entre padres e hijos. La investigación sugiere que el compromiso conjunto y las sesiones cortas proporcionan los mayores beneficios.',
        button: 'Siguiente',
      },
      disclaimer: {
        title: 'Por favor nota',
        body: 'Esta aplicación está en desarrollo activo. Algunas funciones pueden no funcionar - por favor toma capturas de pantalla de los problemas.\n\nEl backend duerme cuando no se usa. Si el inicio de sesión falla, espera 30 segundos. La carga de historias varía según la red.\n\nEl contenido incluye obras originales, historias generadas por IA y libros infantiles usados para investigación educativa.',
        button: 'Siguiente',
      },
      privacy: {
        title: 'Tu privacidad',
        body: 'Tus datos están seguros. No se recopila ni almacena información personal.\n\nIniciar sesión a través de Google o Apple es seguro y seudonimizado - solo recibimos un identificador anónimo, no tu correo electrónico.\n\nLa sincronización de sesiones entre dispositivos es completamente anónima. Todos los datos siguen las mejores prácticas de seguridad con cifrado.\n\nEsta aplicación está diseñada con principios de privacidad primero para ti y tu familia.',
        button: 'Siguiente',
      },
      crashReporting: {
        title: 'Ayúdanos a mejorar',
        body: '¿Te gustaría ayudarnos a mejorar la aplicación compartiendo informes de errores anónimos?\n\nLos informes de errores nos ayudan a identificar y solucionar problemas rápidamente. Solo contienen información técnica sobre lo que salió mal - sin datos personales, fotos ni contenido.\n\nPuedes cambiar esta configuración en cualquier momento en Ajustes.',
        button: 'Comencemos…',
      },
    },
    taglines: {
      welcome: '✨ Historias que crecen con tu hijo',
      screenTime: '👨‍👩‍👧‍👦 Tiempo de calidad juntos',
      personalize: '🎭 Hazlo únicamente suyo',
      voiceRecording: '🎙️ Tu voz, su consuelo',
      research: '🔬 Conectando psicología con tecnología',
    },
    benefits: {
      welcome: 'Experiencias de aprendizaje personalizadas',
      screenTime: 'Recomendado por expertos en desarrollo infantil',
      personalize: 'Avatares personalizados e historias personalizadas',
      voiceRecording: 'Graba una vez, consuela siempre',
      research: 'Creciendo juntos, por siempre',
      disclaimer: '¡Gracias por ayudarnos a mejorar!',
    },
  },

  // Tutorial
  tutorial: {
    welcomeTitle: '¡Bienvenido a Grow with\nFreya! 🎉',
    welcomeDescription: 'Hagamos un recorrido rápido para ayudarte a ti y a tu hijo a aprovechar al máximo la hora del cuento.',
    storiesTitle: 'Biblioteca de cuentos 📚',
    storiesDescription: 'Toca aquí para explorar nuestra colección de cuentos interactivos con hermosas ilustraciones.',
    emotionsTitle: 'Explorador de emociones 😊',
    emotionsDescription: 'Ayuda a tu hijo a aprender sobre emociones a través de juegos con emojis y personajes.',
    calmingTitle: 'Rincón de calma 🎵',
    calmingDescription: 'Accede a música y sonidos relajantes diseñados para momentos difíciles o la hora de dormir.',
    skip: 'Saltar',
    gotIt: '¡Entendido!',
  },
};

