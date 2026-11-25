/* Datos de la galería de Camila Pérez (@letart.arlet).
 *
 * OBRAS: array global. Cada obra:
 *   id      identificador (coincide con el nombre del archivo de imagen)
 *   sala    id de una sala de SALAS
 *   titulo  título provisional
 *   tecnica técnica tal como aparece en el portafolio
 *   medidas "ancho × alto cm"; cadena vacía si no hay medidas (se omite en la cédula)
 *   img     ruta relativa a la imagen (jpg) dentro de img/
 *   alt     texto alternativo descriptivo en español
 *   nota    opcional: se muestra en cursiva bajo la cédula
 *   proceso fotos y videos de cómo se hizo la obra. Copia los archivos a proceso/ y
 *           lista sus rutas en orden: proceso: ['proceso/husky-1.jpg', 'proceso/husky-2.mp4']
 *           Fotos: jpg, png o webp. Videos: mp4 o webm (los .mov del teléfono conviene
 *           convertirlos a mp4). Vacío = no se muestra nada.
 *   texto   texto libre de la artista; se lee al abrir la obra (vacío = no se muestra).
 *           Para varios párrafos usa comillas invertidas: texto: `Primero.
 *           Segundo.`
 *
 * Las medidas se leen como "ancho x alto" para calcular la proporción del cuadro.
 */

// TODO: número de WhatsApp con código de país y solo dígitos (ej. '5215512345678').
// Mientras esté vacío, los botones de consulta enlazan al Instagram.
const WHATSAPP = '';

const INSTAGRAM = 'https://instagram.com/letart.arlet';

const ARTISTA = {
  nombre: 'Camila Pérez',
  marca: 'letart.arlet',
  instagram: INSTAGRAM,
};

// Salas en orden de recorrido. El subtítulo de MASCOTAS viene del portafolio;
// el de las demás salas es provisional.
const SALAS = [
  { id: 'mascotas',   nombre: 'MASCOTAS',     sub: 'CUADROS / LLAVEROS' },
  { id: 'naturaleza', nombre: 'NATURALEZA',   sub: 'PAISAJE Y FLORA' },
  { id: 'replicas',   nombre: 'RÉPLICAS',     sub: 'HOMENAJE A GRANDES MAESTROS' },
  { id: 'digital',    nombre: 'ARTE DIGITAL', sub: 'SERIE ILUSTRADA' },
  { id: 'libre',      nombre: 'ESTILO LIBRE', sub: 'TÉCNICAS VARIADAS' },
  { id: 'textiles',   nombre: 'TEXTILES',     sub: 'INTERVENCIONES EN PRENDAS' },
];

const OBRAS = [
  // ---- MASCOTAS ----
  {
    id: 'mascotas-husky',
    sala: 'mascotas',
    titulo: 'Husky al sol',
    tecnica: 'Pintura al óleo',
    medidas: '10 × 15 cm',
    img: 'img/mascotas-husky.jpg',
    alt: 'Perro husky blanco y negro sentado en una terraza, con collar rojo y sillas de madera al fondo.',
    texto: '',
    proceso: [],
  },
  {
    id: 'mascotas-tiburon-gatos',
    sala: 'mascotas',
    titulo: 'Tormenta sobre el tiburón',
    tecnica: 'Óleo',
    medidas: '19 × 19 cm',
    img: 'img/mascotas-tiburon-gatos.jpg',
    alt: 'Tiburón con las fauces abiertas y dos gatos sobre su lomo, con barcos de vela al fondo.',
    texto: '',
    proceso: [],
  },
  {
    id: 'mascotas-caniches',
    sala: 'mascotas',
    titulo: 'Dúo en azul',
    tecnica: 'Óleo',
    medidas: '40 × 30 cm',
    img: 'img/mascotas-caniches.jpg',
    alt: 'Retrato de dos perros: uno blanco de pelo rizado con moños azules en primer plano y otro café claro detrás, sobre fondo azul.',
    texto: '',
    proceso: [],
  },
  {
    id: 'mascotas-gata-alas',
    sala: 'mascotas',
    titulo: 'Gata de hadas',
    tecnica: 'Óleo',
    medidas: '40 × 30 cm',
    img: 'img/mascotas-gata-alas.jpg',
    alt: 'Gata de pelaje oscuro moteado con alas blancas de hada, en el aire sobre un prado verde.',
    texto: '',
    proceso: [],
  },
  {
    id: 'mascotas-gato-atigrado',
    sala: 'mascotas',
    titulo: 'Mirada verde',
    tecnica: 'Óleo',
    medidas: '30 × 20 cm',
    img: 'img/mascotas-gato-atigrado.jpg',
    alt: 'Gato atigrado gris de ojos verdes, de pie y mirando hacia arriba junto a un poste de cuerda.',
    texto: '',
    proceso: [],
  },
  {
    id: 'mascotas-perro-gris',
    sala: 'mascotas',
    titulo: 'Retrato con orejas',
    tecnica: 'Óleo',
    medidas: '10 × 15 cm',
    img: 'img/mascotas-perro-gris.jpg',
    alt: 'Retrato de un perro gris de orejas oscuras, con collar azul, mirando hacia un lado.',
    texto: '',
    proceso: [],
  },
  {
    id: 'mascotas-llaveros',
    sala: 'mascotas',
    titulo: 'Llaveros de mascotas',
    tecnica: 'Pintura al óleo',
    medidas: '3.5 × 5 cm cada uno',
    img: 'img/mascotas-llaveros.jpg',
    alt: 'Llaveros transparentes con retratos pintados de perros y gatos.',
    texto: '',
    proceso: [],
  },

  // ---- NATURALEZA ----
  {
    id: 'naturaleza-lirios',
    sala: 'naturaleza',
    titulo: 'Lirios',
    tecnica: 'Óleo',
    medidas: '40 × 30 cm',
    img: 'img/naturaleza-lirios.jpg',
    alt: 'Ramo de lirios rosados con capullos y hojas verdes, sobre fondo gris azulado.',
    texto: '',
    proceso: [],
  },
  {
    id: 'naturaleza-paisaje',
    sala: 'naturaleza',
    titulo: 'Prado y nube',
    tecnica: 'Pintura acrílica',
    medidas: '20 × 15 cm',
    img: 'img/naturaleza-paisaje.jpg',
    alt: 'Praderas verdes con un río, una gran nube blanca y montañas al fondo bajo un cielo azul.',
    texto: '',
    proceso: [],
  },

  // ---- RÉPLICAS ----
  {
    id: 'replicas-modigliani',
    sala: 'replicas',
    titulo: 'Young Girl with Loose Hair',
    tecnica: 'Óleo',
    medidas: '40 × 30 cm',
    img: 'img/replicas-modigliani.jpg',
    alt: 'Joven de cabello largo y pelirrojo, con vestido azul, frente a un fondo naranja.',
    texto: '',
    proceso: [],
    nota: 'Réplica de Amedeo Modigliani',
  },
  {
    id: 'replicas-renoir',
    sala: 'replicas',
    titulo: 'Retrato de Madeleine Adam',
    tecnica: 'Lápices de madera',
    medidas: '40 × 30 cm',
    img: 'img/replicas-renoir.jpg',
    alt: 'Niña de cabello castaño con moño oscuro, blusa blanca y faja negra, sentada y de frente al espectador.',
    texto: '',
    proceso: [],
    nota: 'Réplica de Pierre-Auguste Renoir',
  },

  // ---- ARTE DIGITAL ----
  {
    id: 'digital-escarabajo',
    sala: 'digital',
    titulo: 'Escarabajo',
    tecnica: 'Ilustración digital',
    medidas: '',
    img: 'img/digital-escarabajo.jpg',
    alt: 'Ilustración digital de un escarabajo de colores verde, azul y amarillo.',
    texto: '',
    proceso: [],
  },
  {
    id: 'digital-pulpo',
    sala: 'digital',
    titulo: 'Pulpo',
    tecnica: 'Ilustración digital',
    medidas: '',
    img: 'img/digital-pulpo.jpg',
    alt: 'Ilustración digital de un pulpo morado y naranja sobre fondo blanco.',
    texto: '',
    proceso: [],
  },
  {
    id: 'digital-cruz',
    sala: 'digital',
    titulo: 'La cruz en el pecho calibra mi cuerpo',
    tecnica: 'Ilustración digital',
    medidas: '',
    img: 'img/digital-cruz.jpg',
    alt: 'Ilustración en blanco y negro de una cruz con la frase «La cruz en el pecho calibra mi cuerpo».',
    texto: '',
    proceso: [],
    nota: 'Serie de ilustraciones digitales',
  },
  {
    id: 'digital-corazon',
    sala: 'digital',
    titulo: 'Pero mi corazón nunca ha sido mío',
    tecnica: 'Ilustración digital',
    medidas: '',
    img: 'img/digital-corazon.jpg',
    alt: 'Ilustración en blanco y negro de un corazón dibujado a trazo, con la frase «Pero mi corazón nunca ha sido mío».',
    texto: '',
    proceso: [],
    nota: 'Serie de ilustraciones digitales',
  },
  {
    id: 'digital-alas',
    sala: 'digital',
    titulo: 'Aquí tienes este homenaje',
    tecnica: 'Ilustración digital',
    medidas: '',
    img: 'img/digital-alas.jpg',
    alt: 'Ilustración en blanco y negro de dos formas de ala ornamentadas con una pluma, con la frase «Aquí tienes este homenaje».',
    texto: '',
    proceso: [],
    nota: 'Serie de ilustraciones digitales',
  },
  {
    id: 'digital-perla',
    sala: 'digital',
    titulo: 'Es una perla, nadie se fía',
    tecnica: 'Ilustración digital',
    medidas: '',
    img: 'img/digital-perla.jpg',
    alt: 'Ilustración en blanco y negro de una perla dentro de una concha, con la frase «Es una perla, nadie se fía».',
    texto: '',
    proceso: [],
    nota: 'Serie de ilustraciones digitales',
  },
  {
    id: 'digital-mundo',
    sala: 'digital',
    titulo: 'Quisiera renegar de este mundo',
    tecnica: 'Ilustración digital',
    medidas: '',
    img: 'img/digital-mundo.jpg',
    alt: 'Ilustración en blanco y negro de un globo terráqueo dibujado a trazo, con la frase «Quisiera renegar de este mundo».',
    texto: '',
    proceso: [],
    nota: 'Serie de ilustraciones digitales',
  },

  // ---- ESTILO LIBRE ----
  {
    id: 'libre-figura',
    sala: 'libre',
    titulo: 'Figura en llamas',
    tecnica: 'Pintura acrílica',
    medidas: '40 × 30 cm',
    img: 'img/libre-figura.jpg',
    alt: 'Figura femenina estilizada en tonos naranjas y rojos sobre un fondo negro.',
    texto: '',
    proceso: [],
  },
  {
    id: 'libre-pastel',
    sala: 'libre',
    titulo: 'Pastel de moras',
    tecnica: 'Acuarela',
    medidas: '20 × 15 cm',
    img: 'img/libre-pastel.jpg',
    alt: 'Rebanada de pastel con moras en tonos morados sobre un fondo claro con manchas rosas.',
    texto: '',
    proceso: [],
  },
  {
    id: 'libre-silla',
    sala: 'libre',
    titulo: 'Silla roja',
    tecnica: 'Óleo',
    medidas: '20 × 15 cm',
    img: 'img/libre-silla.jpg',
    alt: 'Silla de madera con asiento blanco frente a una cortina roja.',
    texto: '',
    proceso: [],
  },

  // ---- TEXTILES ----
  {
    id: 'textiles-chaqueta',
    sala: 'textiles',
    titulo: 'Chaqueta negra',
    tecnica: 'Pintura sobre chaqueta de mezclilla',
    medidas: '',
    img: 'img/textiles-chaqueta.jpg',
    alt: 'Chaqueta de mezclilla negra con un panel pintado de un sapo de camisa azul, la bandera de Puerto Rico y un corazón rojo.',
    texto: '',
    proceso: [],
  },
];

// Exposición explícita como globales para los demás scripts.
window.OBRAS = OBRAS;
window.SALAS = SALAS;
