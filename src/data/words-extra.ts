/**
 * Words Extra — Categorías faltantes
 *
 * Graffiti, Cultura, Historia, Beatbox, Producción, Chile
 * Cada categoría tiene ~10-15 palabras con knowledge cards completas.
 */
import type { WordEntry } from '../game/types'

export const extraWords: WordEntry[] = [

  // ─── GRAFFITI ───
  { word: 'TAG', category: 'graffiti', difficulty: 'easy', knowledge: { title: 'Tag / Firma', description: 'Firma estilizada que identifica a un escritor de graffiti. Es la forma más básica y fundamental del graffiti.', importance: 'El tag es la firma del artista. Sin tag, no hay graffiti. Es la base de todo el arte del writing.', funFact: 'TAKI 183 fue uno de los primeros writers famosos de Nueva York en los años 70, cuyo tag aparecía por toda la ciudad.', related: ['GRAFFITI', 'PIECE', 'WRITER'] } },
  { word: 'PIECE', category: 'graffiti', difficulty: 'easy', knowledge: { title: 'Piece / Obra', description: 'Abreviatura de masterpiece. Pieza grande y elaborada de graffiti, usualmente con letras 3D, colores múltiples y fondos detallados.', importance: 'La pieza es la máxima expresión del graffiti. Muestra habilidad técnica, creatividad y dedicación.', related: ['TAG', 'THROW_UP', 'MURAL'] } },
  { word: 'WILDSTYLE', category: 'graffiti', difficulty: 'hard', knowledge: { title: 'Wildstyle', description: 'Estilo complejo de graffiti con letras entrelazadas, flechas, púas y conexiones que hacen difícil su lectura.', importance: 'El Wildstyle representa la cumbre técnica del graffiti. Solo los writers más hábiles dominan este estilo.', funFact: 'Wildstyle se originó en el Bronx a finales de los 70 e inicios de los 80, cuando los writers competían por tener el estilo más complejo.', related: ['PIECE', 'BUBBLE', 'WRITER'] } },
  { word: 'MURAL', category: 'graffiti', difficulty: 'easy', knowledge: { title: 'Mural', description: 'Pieza grande de graffiti en una pared, usualmente con permiso legal. Puede incluir figuras, paisajes y mensajes.', importance: 'Los murales han llevado el graffiti del vandalismo al arte legítimo, decorando ciudades y galerías.', related: ['PIECE', 'GRAFFITI', 'WRITER'] } },

  // ─── CULTURA HIP HOP ───
  { word: 'PEACE', category: 'cultura', difficulty: 'easy', knowledge: { title: 'Peace / Paz', description: 'Elemento fundamental del hip hop, que nació como alternativa pacífica a la violencia de las pandillas del Bronx.', importance: 'La paz es el primer pilar. Afrika Bambaataa fundó la Zulu Nation para promover la resolución pacífica de conflictos.', related: ['ZULU_NATION', 'KNOWLEDGE', 'UNITY'] } },
  { word: 'UNITY', category: 'cultura', difficulty: 'easy', knowledge: { title: 'Unity / Unidad', description: 'El hip hop une a personas de todas las razas, clases y orígenes bajo una misma cultura.', importance: 'La unidad es lo que hace del hip hop un movimiento global. Trasciende fronteras, idiomas y diferencias.', related: ['PEACE', 'KNOWLEDGE', 'HIP_HOP'] } },
  { word: 'KNOWLEDGE', category: 'cultura', difficulty: 'easy', knowledge: { title: 'Knowledge / Conocimiento', description: 'El quinto elemento del hip hop según Afrika Bambaataa, añadido a los cuatro originales. El conocimiento de uno mismo y de la cultura.', importance: 'El conocimiento es lo que diferencia al hip hop de otras modas. Sin conocimiento, solo hay entretenimiento vacío.', related: ['PEACE', 'UNITY'] } },
  { word: 'RESPECT', category: 'cultura', difficulty: 'easy', knowledge: { title: 'Respeto', description: 'Valor fundamental del hip hop. Se gana con habilidad, autenticidad y contribución a la cultura.', importance: 'En el hip hop, el respeto no se exige, se gana. Es la moneda más valiosa en la comunidad.', related: ['PEACE', 'KNOWLEDGE', 'UNITY'] } },
  { word: 'BAMBAATAA', category: 'cultura', difficulty: 'medium', knowledge: { title: 'Afrika Bambaataa', description: 'DJ y activista del Bronx, fundador de la Zulu Nation. Considerado el padrino del hip hop por establecer sus fundamentos culturales.', importance: 'Bambaataa dio estructura y filosofía al hip hop, transformándolo de una moda juvenil a un movimiento cultural global.', related: ['ZULU_NATION', 'PEACE', 'ELEMENTS'] } },

  // ─── HISTORIA ───
  { word: 'BRONX', category: 'historia', difficulty: 'easy', knowledge: { title: 'Bronx', description: 'Barrio de Nueva York donde nació el hip hop en la década de 1970. Cuna de los primeros DJs, MCs, breakers y writers.', importance: 'El Bronx es la tierra sagrada del hip hop. Sin el Bronx, no existiría esta cultura global.', funFact: 'La 1520 Sedgwick Avenue es considerada la "casa del hip hop", donde DJ Kool Herc hizo su primera fiesta en 1973.', related: ['DJ_KOOL_HERC', 'HIP_HOP', 'BLOCK_PARTY'] } },
  { word: 'SUGARHILL', category: 'historia', difficulty: 'medium', knowledge: { title: 'Sugarhill Records', description: 'Sello discográfico fundado en 1979 por Sylvia Robinson. Lanzó "Rapper\'s Delight", la primera canción de rap comercial.', importance: 'Sugarhill llevó el rap del Bronx a las radios de todo el mundo. Sin ellos, el hip hop habría tardado más en globalizarse.', related: ['MC', 'HIP_HOP', 'OLD_SCHOOL'] } },
  { word: 'OLD_SCHOOL', category: 'historia', difficulty: 'easy', knowledge: { title: 'Old School', description: 'Período inicial del hip hop (1979-1985) caracterizado por rimas simples, ritmos funk y party vibes.', importance: 'El Old School estableció las bases del rap. Artistas como Grandmaster Flash y Run-DMC definieron el sonido temprano.', related: ['NEW_SCHOOL', 'SUGARHILL'] } },

  // ─── BEATBOX ───
  { word: 'HUMANBEATBOX', category: 'beatbox', difficulty: 'easy', knowledge: { title: 'Human Beatbox', description: 'Término original para el beatbox. El cuerpo humano como instrumento de percusión.', importance: 'El human beatbox era la alternativa cuando no había equipos de sonido. Cualquier persona con boca podía hacer ritmo.', related: ['BEATBOX', 'MOUTHDRUM', 'VOCALPERCUSSION'] } },
  { word: 'SNARE', category: 'beatbox', difficulty: 'medium', knowledge: { title: 'Snare / Caja', description: 'Sonido de caja de batería imitado con beatbox. Se produce con un sonido seco de "pfssh" o "tsk".', importance: 'La caja es el segundo sonido más importante del beatbox después del bombo. Define el groove del ritmo.', related: ['BEATBOX', 'KICK', 'HI_HAT'] } },
  { word: 'KICK', category: 'beatbox', difficulty: 'medium', knowledge: { title: 'Kick / Bombo', description: 'Sonido grave de bombo de batería. En beatbox se produce con la letra "B" sin voz, usando los labios.', importance: 'El bombo es la base rítmica del beatbox. Sin un buen kick, el ritmo no tiene peso ni presencia.', related: ['BEATBOX', 'SNARE', 'MOUTHDRUM'] } },

  // ─── PRODUCCIÓN MUSICAL ───
  { word: 'SAMPLE', category: 'produccion', difficulty: 'easy', knowledge: { title: 'Sample / Muestra', description: 'Fragmento de una grabación existente reutilizado en una nueva canción. La base de la producción de hip hop.', importance: 'El sampleo es el corazón del hip hop. Sin samples, el hip hop no tendría su sonido característico.', funFact: 'El "Amen Break" es el sample más sampleado del mundo. Samplers icónicos como el Akai MPC60, el SP-1200 y el MPC3000 definieron el sonido del hip hop.', related: ['MPC', 'BEAT', 'PRODUCER'] } },
  { word: 'MPC', category: 'produccion', difficulty: 'medium', knowledge: { title: 'MPC (Music Production Center)', description: 'Sampler/secuenciador de Akai que revolucionó la producción musical. Permite samplear, secuenciar y mezclar.', importance: 'La MPC es el instrumento más importante del hip hop. DJ Premier, J Dilla y Kanye West la usaron para crear clásicos.', funFact: 'J Dilla es considerado el maestro indiscutible de la MPC. Su técnica de no cuantizar (dejar los golpes ligeramente fuera del grid) creó el característico "swing Dilla" que define el sonido de beats orgánicos.', related: ['SAMPLE', 'BEAT'] } },
  { word: 'BEAT', category: 'produccion', difficulty: 'easy', knowledge: { title: 'Beat / Base', description: 'Pista instrumental sobre la que se rapea. Combinación de drums, sample y a veces melodía original.', importance: 'El beat es el alma de la canción de hip hop. Un gran beat puede hacer inmortal a un MC mediocre.', related: ['SAMPLE', 'PRODUCER'] } },
  { word: 'PRODUCER', category: 'produccion', difficulty: 'easy', knowledge: { title: 'Producer / Productor', description: 'Creador de beats y responsable del sonido de una canción o álbum. En hip hop, el productor es tan importante como el MC.', importance: 'Grandes productores como Dr. Dre, DJ Premier y Pharrell han definido eras enteras del hip hop con su sonido.', related: ['BEAT', 'SAMPLE', 'MPC'] } },

  // ─── HIP HOP CHILENO ───
  { word: 'SAGA', category: 'chile', difficulty: 'medium', knowledge: { title: 'Saga', description: 'Uno de los primeros programas de radio dedicados al hip hop en Chile. Referente para toda una generación.', importance: 'La radio fue el principal medio de difusión del hip hop chileno antes de internet. Programa Saga era cita obligada.', related: ['CHILENO', 'MC'] } },
]

export const extraCategories = [
  { id: 'graffiti', existing: 'graffiti' as const },
  { id: 'beatbox', existing: 'beatbox' as const },
  { id: 'cultura', existing: 'cultura' as const },
  { id: 'historia', existing: 'historia' as const },
  { id: 'produccion', existing: 'produccion' as const },
  { id: 'chile', existing: 'chile' as const },
]
