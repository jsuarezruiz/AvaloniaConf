/* ==========================================================================
   Site content: dates, links and every string in both languages.
   Edit here; script.js applies it. After changing copy that the English page
   should carry for crawlers, run `node tools/sync-pages.mjs`.

   A value may be an object keyed by phase ({ cfp, selection, live, ended }):
   the page shows the variant for the current phase (see script.js).
   ========================================================================== */

window.AV = {
  site: {
    // Production URL with a trailing slash, e.g. "https://conf.example.org/".
    // This is the one place to set it: `node tools/sync-pages.mjs` then writes
    // canonical/hreflang/og:url, absolute social images, the event URL in the
    // structured data and calendars, robots.txt and sitemap.xml. Until it is
    // set, those URL-dependent tags are simply left out.
    url: "https://jsuarezruiz.github.io/AvaloniaConf/",
    // All times are the event's own zone, Europe/Madrid (CET, UTC+01:00 in winter).
    cfpClose: "2026-11-13T23:59:00+01:00",
    eventStart: "2026-12-02T09:00:00+01:00",
    eventEnd: "2026-12-02T17:00:00+01:00",
    cfpUrl: "https://koliseo.com/jsuarezruiz/avalonia-conf-2026/sessions",
    // The event's page on Koliseo: linked from the structured data, and the
    // attendance URL search engines see until site.url / streamUrl exist.
    koliseoUrl: "https://koliseo.com/jsuarezruiz/avalonia-conf-2026",
    // Public stream. Until it is set, live-phase buttons fall back to the FAQ.
    streamUrl: "",
    // Where Code of Conduct reports go (published on conduct.html).
    conductEmail: "javiersuarezruiz@hotmail.com"
  },

  copy: {
    es: {
      title: "Avalonia Conf Online 2026 | 2 de diciembre",
      description:
        "Conferencia online y gratuita sobre Avalonia UI y .NET. Miércoles 2 de diciembre de 2026, de 09:00 a 17:00 CET.",
      skip: "Saltar al contenido",
      navLabel: "Navegación principal",
      railLabel: "Capítulos",
      brandTitle: "Avalonia Conf",
      brandSubtitle: "Online",
      menuButton: "Abrir menú",
      menuClose: "Cerrar menú",
      languageButton: "Switch to English",
      themeToLight: "Cambiar a tema claro",
      themeToDark: "Cambiar a tema oscuro",
      calendarFile: "calendar.ics",
      localTime: "Tu hora: {range}",
      calendar: {
        summary: "Avalonia Conf Online 2026",
        description: "Conferencia online y gratuita sobre Avalonia UI y .NET. Charlas de 45 minutos de 09:00 a 17:00 CET, con pausa de 14:00 a 15:00. Streaming abierto, sin registro."
      },
      nav: {
        cfp: "Call for Papers",
        format: "Formato",
        program: "Programa",
        community: "Comunidad",
        faq: "Info"
      },
      rail: ["Inicio", "Call for Papers", "Formato", "Programa", "Comunidad", "Info"],
      status: {
        chip: {
          cfp: "CFP abierto",
          selection: "Streaming gratuito",
          live: "En directo",
          ended: "Gracias por venir"
        }
      },
      cta: {
        primary: {
          cfp: "Enviar propuesta",
          selection: "Añadir al calendario",
          live: "Ver en directo",
          ended: "Ver el streaming"
        },
        secondary: "Añadir al calendario"
      },
      hero: {
        chips: ["Online · gratis", "Miércoles 2 de diciembre de 2026", "09:00-17:00 CET"],
        title: "Avalonia Conf Online 2026",
        big: ["AVALONIA", "CONF"],
        copy: "Una jornada online y gratuita para aprender, compartir y construir mejores aplicaciones multiplataforma con Avalonia UI y .NET.",
        countdownLabel: {
          cfp: "Cuenta atrás",
          selection: "Cuenta atrás",
          live: "En directo · termina en",
          ended: "El evento ha terminado"
        },
        countdownAria: "Cuenta atrás",
        countdownDate: "2 DIC · 09:00 CET",
        countdownUnits: ["Días", "Horas", "Min", "Seg"],
        scroll: "Scroll"
      },
      cfp: {
        kicker: "Call for Papers",
        title: "Buscamos charlas técnicas con experiencia real y una idea nítida.",
        body: "El evento estará compuesto solo por charlas. Queremos propuestas útiles para personas que diseñan, desarrollan o mantienen aplicaciones con Avalonia: arquitectura, rendimiento, UI, tooling, despliegue y casos de producción.",
        panelTitle: {
          cfp: "CFP abierto hasta el 13 de noviembre",
          selection: "CFP cerrado",
          live: "CFP cerrado",
          ended: "CFP cerrado"
        },
        panelBody: {
          cfp: "Prepara una propuesta directa: problema, contexto, aprendizaje principal y nivel esperado. El envío se realiza a través de Koliseo hasta el 13 de noviembre a las 23:59 CET.",
          selection:
            "El Call for Papers cerró el 13 de noviembre. Gracias a todas las personas que enviaron propuesta: la agenda se publicará aquí.",
          live: "El Call for Papers cerró el 13 de noviembre. Gracias a todas las personas que enviaron propuesta.",
          ended: "El Call for Papers cerró el 13 de noviembre. Gracias a todas las personas que enviaron propuesta."
        },
        panelButton: "Enviar propuesta en Koliseo",
        conduct: "Todas las charlas siguen el código de conducta",
        datesLabel: "Fechas clave",
        dates: [
          ["13 nov · 23:59 CET", "Cierre del CFP"],
          ["Tras la selección", "Agenda publicada"],
          ["2 dic · 09:00 CET", "En directo, gratis"]
        ],
        topics: [
          ["Arquitectura", "MVVM, composición, navegación, modularidad y patrones aplicados."],
          ["UI y producto", "Diseño de interfaces, theming, accesibilidad y experiencias pulidas."],
          ["Rendimiento", "Arranque, renderizado, memoria, profiling y optimización real."],
          ["Multiplataforma", "Desktop, mobile, browser, empaquetado, despliegue y CI/CD."],
          ["Migraciones", "Lecciones al pasar desde WPF, Xamarin.Forms, WinUI o .NET MAUI."],
          ["Ecosistema", "Open source, librerías, tooling y prácticas que escalan."]
        ]
      },
      format: {
        kicker: "Formato online",
        title: "Charlas de 45 minutos, ritmo preciso y una experiencia pensada para remoto.",
        body: "El día se organiza en dos bloques de charlas, mañana y tarde. Entre charlas habrá 5 minutos de descanso y de 14:00 a 15:00 habrá una pausa antes del bloque de tarde.",
        steps: [
          ["Solo charlas", "Sin workshops ni mesas: cada sesión tendrá foco técnico y 45 minutos de duración."],
          ["Ritmo cuidado", "Cinco minutos entre charlas para respirar, cambiar de contexto y preparar la siguiente sesión."],
          ["Online primero", "El formato remoto permite reunir ponentes de cualquier parte del mundo y seguir cada charla cómodamente desde cualquier lugar."]
        ],
        stage: {
          live: "LIVE",
          session: "Avalonia session",
          speaker: "Speaker",
          duration: "45 min",
          break: "5 min break",
          pause: "14:00-15:00 pausa"
        }
      },
      program: {
        kicker: "Programa",
        title: "La agenda definitiva se publicará después del Call for Papers.",
        body: "El marco horario ya está fijado para que speakers y asistentes puedan planificar el día.",
        blocks: [
          ["09:00-13:55", "Bloque de mañana", "Charlas seleccionadas, 45 minutos cada una, con 5 minutos entre sesiones."],
          ["14:00-15:00", "Pausa", "Corte central para descansar antes del bloque de tarde."],
          ["15:00-17:00", "Bloque de tarde", "Más charlas seleccionadas y cierre del día dentro del horario previsto."]
        ],
        rhythmTitle: "Ritmo de sesiones",
        rhythm: [
          ["45 min", "Charla"],
          ["5 min", "Descanso"],
          ["14-15", "Pausa"]
        ]
      },
      community: {
        kicker: "Comunidad",
        title: "Un punto de encuentro para el ecosistema Avalonia.",
        body: "Avalonia Conf nace para dar visibilidad a proyectos, prácticas y aprendizajes de la comunidad. Una jornada enfocada en contenido aplicable, criterio técnico y conversación entre personas que construyen con .NET."
      },
      faq: {
        kicker: "Información clave",
        title: "Lo imprescindible por ahora.",
        items: [
          ["¿Cuándo será?", "El miércoles 2 de diciembre de 2026, online, de 09:00 a 17:00 CET."],
          [
            "¿Cómo puedo asistir?",
            "Es gratis y sin registro: el evento se emitirá en un streaming abierto cuyo enlace se publicará en esta página antes del 2 de diciembre."
          ],
          [
            "¿Ya se pueden enviar charlas?",
            {
              cfp: "Sí. El Call for Papers está abierto hasta el 13 de noviembre a las 23:59 CET y las propuestas se envían a través del formulario de Koliseo.",
              selection: "El Call for Papers cerró el 13 de noviembre. La agenda se publicará aquí cuando termine la selección.",
              live: "El Call for Papers cerró el 13 de noviembre.",
              ended: "El Call for Papers cerró el 13 de noviembre."
            }
          ],
          ["¿Qué duración tendrán las charlas?", "Todas las charlas tendrán 45 minutos. Entre charlas habrá 5 minutos de descanso."],
          ["¿En qué idiomas se aceptan charlas?", "Se aceptan propuestas y charlas en español e inglés. El idioma de cada sesión se indicará en el programa."],
          [
            "¿Hay un código de conducta?",
            "Sí. Asistentes, ponentes y organización lo seguimos en el chat, en las charlas y en redes, y explica cómo informar de cualquier problema."
          ]
        ],
        conductLink: "Leer el código de conducta"
      },
      conduct: {
        pageTitle: "Código de conducta | Avalonia Conf Online 2026",
        description:
          "Cómo esperamos que se comporten todas las personas que participan en Avalonia Conf Online 2026, y cómo informar de un problema.",
        kicker: "Código de conducta",
        title: "Un espacio acogedor para todas las personas.",
        lead: "Avalonia Conf es un lugar para aprender y compartir. Todas las personas que participan (asistentes, ponentes, organización y patrocinadores) deben contribuir a que sea un espacio respetuoso y libre de acoso, sea cual sea su género, identidad o expresión de género, orientación sexual, discapacidad, aspecto físico, edad, etnia, nacionalidad, religión, nivel de experiencia o tecnología favorita.",
        scopeTitle: "Dónde se aplica",
        scope: "En todos los espacios relacionados con el evento: el streaming y su chat, las preguntas a ponentes, las charlas y sus diapositivas, las publicaciones en redes sociales que usan el nombre del evento, el Call for Papers y cualquier contacto privado que surja a raíz del evento. Se aplica antes, durante y después de la jornada.",
        expectTitle: "Qué esperamos",
        expect: [
          "Trata a los demás con respeto y consideración, en público y en privado.",
          "Critica ideas, no personas. El desacuerdo técnico es bienvenido; los ataques personales, no.",
          "Ten paciencia con otros idiomas, acentos y niveles de experiencia: el público es global.",
          "Respeta los límites y la privacidad de cada persona, y para cuando te lo pidan.",
          "Cuida de los demás y avisa a la organización si algo no va bien."
        ],
        avoidTitle: "Qué no es aceptable",
        avoid: [
          "El acoso, la intimidación o la discriminación en cualquiera de sus formas.",
          "Lenguaje, imágenes o bromas ofensivas, sexualizadas o violentas, en el chat, en las charlas o en las diapositivas.",
          "Ataques personales, trolling, spam o interrumpir a propósito el chat o las preguntas.",
          "Compartir información privada de alguien, o grabar y difundir a otras personas sin su consentimiento.",
          "Mensajes privados no deseados, o seguir contactando con alguien después de que te pida que pares.",
          "Hacerse pasar por ponentes, por la organización o por otras personas participantes."
        ],
        speakersTitle: "Ponentes",
        speakers: "Las charlas y las diapositivas siguen las mismas normas. Evita imágenes sexualizadas y ejemplos discriminatorios. Si una charla necesita tratar un tema sensible, avisa a la organización con antelación para añadir un aviso de contenido.",
        actionTitle: "Si alguien lo incumple",
        action: "La organización puede tomar las medidas que considere adecuadas: un aviso, retirar mensajes, expulsar a alguien del chat u otros espacios del evento, o detener una charla. Se espera que cualquier persona a la que se le pida parar lo haga de inmediato.",
        reportTitle: "Cómo informar",
        report: "Si sufres o presencias un comportamiento que incumple este código, o tienes cualquier otra preocupación, escribe a:",
        reportDetails: "Cuéntanos qué pasó, cuándo y dónde (por ejemplo, la hora de un mensaje del chat) y quién estuvo implicado, si lo sabes. Los informes se tratan de forma confidencial y nadie sufrirá represalias por informar de buena fe.",
        back: "Volver a la conferencia"
      },
      closing: {
        line: "Nos vemos bajo la aurora."
      },
      notFound: {
        title: "Página no encontrada",
        body: "Esta dirección no existe o ha cambiado. La conferencia sigue en su sitio.",
        home: "Ir a Avalonia Conf"
      },
      footer: {
        date: "Online · 2 diciembre 2026",
        calendar: "Calendario",
        conduct: "Código de conducta"
      }
    },

    en: {
      title: "Avalonia Conf Online 2026 | December 2",
      description:
        "Free online conference on Avalonia UI and .NET. Wednesday, December 2, 2026, 09:00 to 17:00 CET.",
      skip: "Skip to content",
      navLabel: "Main navigation",
      railLabel: "Chapters",
      brandTitle: "Avalonia Conf",
      brandSubtitle: "Online",
      menuButton: "Open menu",
      menuClose: "Close menu",
      languageButton: "Cambiar a español",
      themeToLight: "Switch to light theme",
      themeToDark: "Switch to dark theme",
      calendarFile: "calendar-en.ics",
      localTime: "Your time: {range}",
      calendar: {
        summary: "Avalonia Conf Online 2026",
        description: "Free online conference on Avalonia UI and .NET. 45-minute talks from 09:00 to 17:00 CET, with a pause from 14:00 to 15:00. Open live stream, no registration."
      },
      nav: {
        cfp: "Call for Papers",
        format: "Format",
        program: "Schedule",
        community: "Community",
        faq: "Info"
      },
      rail: ["Home", "Call for Papers", "Format", "Schedule", "Community", "Info"],
      status: {
        chip: {
          cfp: "CFP is open",
          selection: "Free live stream",
          live: "Live now",
          ended: "Thanks for joining"
        }
      },
      cta: {
        primary: {
          cfp: "Submit a proposal",
          selection: "Add to calendar",
          live: "Watch live",
          ended: "Watch the stream"
        },
        secondary: "Add to calendar"
      },
      hero: {
        chips: ["Online · free", "Wednesday, December 2, 2026", "09:00-17:00 CET"],
        title: "Avalonia Conf Online 2026",
        big: ["AVALONIA", "CONF"],
        copy: "One free online day to learn, share and build better cross-platform applications with Avalonia UI and .NET.",
        countdownLabel: {
          cfp: "Countdown",
          selection: "Countdown",
          live: "Live now · ends in",
          ended: "The event has ended"
        },
        countdownAria: "Countdown",
        countdownDate: "DEC 2 · 09:00 CET",
        countdownUnits: ["Days", "Hours", "Min", "Sec"],
        scroll: "Scroll"
      },
      cfp: {
        kicker: "Call for Papers",
        title: "We are looking for technical talks with real experience and a clear point of view.",
        body: "The event will be made only of talks. We want useful proposals for people designing, building or maintaining applications with Avalonia: architecture, performance, UI, tooling, deployment and production stories.",
        panelTitle: {
          cfp: "CFP open until November 13",
          selection: "CFP closed",
          live: "CFP closed",
          ended: "CFP closed"
        },
        panelBody: {
          cfp: "Prepare a focused proposal: problem, context, main takeaway and expected level. Submissions go through Koliseo until November 13 at 23:59 CET.",
          selection:
            "The Call for Papers closed on November 13. Thank you to everyone who sent a proposal: the agenda will be published here.",
          live: "The Call for Papers closed on November 13. Thank you to everyone who sent a proposal.",
          ended: "The Call for Papers closed on November 13. Thank you to everyone who sent a proposal."
        },
        panelButton: "Submit on Koliseo",
        conduct: "Every talk follows the Code of Conduct",
        datesLabel: "Key dates",
        dates: [
          ["Nov 13 · 23:59 CET", "CFP closes"],
          ["After selection", "Agenda published"],
          ["Dec 2 · 09:00 CET", "Live and free"]
        ],
        topics: [
          ["Architecture", "MVVM, composition, navigation, modularity and applied patterns."],
          ["UI and product", "Interface design, theming, accessibility and polished experiences."],
          ["Performance", "Startup, rendering, memory, profiling and practical optimization."],
          ["Cross-platform", "Desktop, mobile, browser, packaging, deployment and CI/CD."],
          ["Migrations", "Lessons from moving from WPF, Xamarin.Forms, WinUI or .NET MAUI."],
          ["Ecosystem", "Open source, libraries, tooling and practices that scale."]
        ]
      },
      format: {
        kicker: "Online format",
        title: "45-minute talks, precise pacing and an experience designed for remote attendance.",
        body: "The day is organized into two talk blocks, morning and afternoon. There will be a 5-minute break between talks and a central pause from 14:00 to 15:00.",
        steps: [
          ["Talks only", "No workshops or panels: every session is technical and 45 minutes long."],
          ["A deliberate rhythm", "Five minutes between talks to pause, switch context and prepare for the next session."],
          ["Online first", "The remote format brings together speakers from anywhere in the world while making every talk easy to follow from wherever you are."]
        ],
        stage: {
          live: "LIVE",
          session: "Avalonia session",
          speaker: "Speaker",
          duration: "45 min",
          break: "5 min break",
          pause: "14:00-15:00 break"
        }
      },
      program: {
        kicker: "Schedule",
        title: "The final agenda will be published after the Call for Papers.",
        body: "The timing framework is already set so speakers and attendees can plan the day.",
        blocks: [
          ["09:00-13:55", "Morning block", "Selected talks, 45 minutes each, with 5 minutes between sessions."],
          ["14:00-15:00", "Break", "A central pause before the afternoon block."],
          ["15:00-17:00", "Afternoon block", "More selected talks and the close of the day within the planned schedule."]
        ],
        rhythmTitle: "Session rhythm",
        rhythm: [
          ["45 min", "Talk"],
          ["5 min", "Break"],
          ["14-15", "Pause"]
        ]
      },
      community: {
        kicker: "Community",
        title: "A meeting point for the Avalonia ecosystem.",
        body: "Avalonia Conf exists to give visibility to community projects, practices and lessons learned. One day focused on applicable content, technical judgment and conversations between people building with .NET."
      },
      faq: {
        kicker: "Key information",
        title: "What matters for now.",
        items: [
          ["When is it?", "Wednesday, December 2, 2026, online, from 09:00 to 17:00 CET."],
          [
            "How do I attend?",
            "It is free and needs no registration: the event is broadcast on an open live stream, and the link will be published on this page before December 2."
          ],
          [
            "Can talks be submitted already?",
            {
              cfp: "Yes. The Call for Papers is open until November 13 at 23:59 CET, and proposals are submitted through the Koliseo form.",
              selection: "The Call for Papers closed on November 13. The agenda will be published here once selection is done.",
              live: "The Call for Papers closed on November 13.",
              ended: "The Call for Papers closed on November 13."
            }
          ],
          ["How long are the talks?", "Every talk will be 45 minutes. There will be a 5-minute break between talks."],
          ["Which talk languages are accepted?", "Talk proposals and sessions are accepted in Spanish and English. Each session's language will be shown in the schedule."],
          [
            "Is there a code of conduct?",
            "Yes. Attendees, speakers and organizers all follow it in the chat, in talks and on social media, and it explains how to report any problem."
          ]
        ],
        conductLink: "Read the Code of Conduct"
      },
      conduct: {
        pageTitle: "Code of Conduct | Avalonia Conf Online 2026",
        description:
          "How everyone taking part in Avalonia Conf Online 2026 is expected to behave, and how to report a problem.",
        kicker: "Code of Conduct",
        title: "A welcoming space for everyone.",
        lead: "Avalonia Conf is a place to learn and share. Everyone who takes part (attendees, speakers, organizers and sponsors) is expected to keep it respectful and free of harassment, whatever their gender, gender identity or expression, sexual orientation, disability, physical appearance, age, ethnicity, nationality, religion, level of experience or technology of choice.",
        scopeTitle: "Where it applies",
        scope: "In every space connected with the event: the live stream and its chat, questions to speakers, talks and slides, social media posts that use the event's name, the Call for Papers, and any private contact that grows out of the event. It applies before, during and after the day.",
        expectTitle: "What we expect",
        expect: [
          "Be respectful and considerate, in public and in private.",
          "Critique ideas, not people. Technical disagreement is welcome; personal attacks are not.",
          "Be patient with other languages, accents and levels of experience: the audience is global.",
          "Respect people's boundaries and privacy, and stop when you are asked to.",
          "Look out for each other, and tell the organizers if something is wrong."
        ],
        avoidTitle: "What is not acceptable",
        avoid: [
          "Harassment, intimidation or discrimination in any form.",
          "Offensive, sexualized or violent language, images or jokes, in the chat, in talks or on slides.",
          "Personal attacks, trolling, spam, or deliberately disrupting the chat or the questions.",
          "Sharing someone's private information, or recording and republishing people without their consent.",
          "Unwelcome private messages, or continuing to contact someone after they ask you to stop.",
          "Impersonating speakers, organizers or other participants."
        ],
        speakersTitle: "Speakers",
        speakers: "Talks and slides follow the same rules. Please avoid sexualized imagery and discriminatory examples. If a talk needs to touch on a sensitive subject, let the organizers know in advance so a content note can be added.",
        actionTitle: "If someone breaks it",
        action: "Organizers may take whatever action they consider appropriate: a warning, removing messages, removing someone from the chat or other event spaces, or stopping a talk. Anyone asked to stop is expected to do so immediately.",
        reportTitle: "How to report",
        report: "If you experience or witness behavior that breaks this code, or have any other concern, write to:",
        reportDetails: "Tell us what happened, when and where (for example, the time of a chat message) and who was involved, if you know. Reports are handled confidentially, and nobody will face retaliation for reporting in good faith.",
        back: "Back to the conference"
      },
      closing: {
        line: "See you beneath the aurora."
      },
      notFound: {
        title: "Page not found",
        body: "This address does not exist or has moved. The conference is still right where it was.",
        home: "Go to Avalonia Conf"
      },
      footer: {
        date: "Online · December 2, 2026",
        calendar: "Calendar",
        conduct: "Code of Conduct"
      }
    }
  }
};
