const wordPairs = [
  {
    main: 'Sorry I am not a __, did I misspell?',
    correct: 'native speaker',
    options: ['native', 'speaker', 'native-speaker', 'native speaker']
  },

   {
    main: 'I am a __ professional',
    correct: 'thirty-one-year-old',
    options: ['thirty one year old', 'thirty-one-year old', 'thirty-one-year-old', 'thirty-one-years-old']
  },

   {
    main: 'I work as __ thirty-three-year-old engineer.',
    correct: 'a',
    options: ['-', 'a', 'an', 'the']
  },

  {
    main: 'She is __ twenty-five years old.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },

  {
    main: 'He earned _ Master’s degree in marketing.',
    correct: 'a',
    options: ['-', 'a', 'an', 'the']
  },

    {
    main: 'He earned  a Master’s degree __ marketing.',
    correct: 'in',
    options: ['at', 'in', 'of', 'with']
  },

  {
    main: 'I have __ extensive experience in project management.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },

   {
    main: 'I am good __ math and drawing.',
    correct: 'at',
    options: ['with', 'in', 'at', 'of']
  },
  {
    main: 'That trip was __ unforgettable experience.',
    correct: 'an',
    options: ['-', 'a', 'an', 'the']
  },

   {
    main: 'I hope to get __ hands-on experience working in a company.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },

  {
    main: 'She sent me a message __ WhatsApp.',
    correct: 'on',
    options: ['in', 'on', 'at', 'with']
  },

   {
    main: 'I talked to him via __ Zoom.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },

  {
    main: 'I couldn’t open __ WhatsApp message',
    correct: 'the',
    options: ['-', 'a', 'an', 'the']
  },

   {
    main: ' I look forward __ hearing from you',
    correct: 'to',
    options: ['with', 'a', 'to', 'the']
  },

  {
    main: ' I’m interested in learning __ language like Spanish.',
    correct: 'a',
    options: ['-', 'a', 'an', 'the']
  },

  {
    main: 'I look forward to __ from you',
    correct: 'hearing',
    options: ['hear', 'be heared', 'hearing', 'be hearing']
  },

  {
    main: 'Many people think it is __ to travel by train than by car',
    correct: 'safer',
    options: ['safe', 'safer', 'safter', 'safetier']
  },

    {
    main: '_____ prefer practical demonstrations to theoretical explanations.',
    correct: 'the majority of people',
    options: ['most of people', 'the most people', 'the majority of people', 'majority people']
  },

  {
    main: '___ believe that science is difficult to understand..',
    correct: 'most people',
    options: ['most of people', 'the most people', 'most people', 'majority people']
  },

    {
    main: 'Most people __ experiments only when required by their teacher.',
    correct: 'do',
    options: ['make', 'do', 'have', 'try']
  },

  
    {
    main: 'He is really serious __ getting this job',
    correct: 'about',
    options: ['of', 'about', 'with', 'for']
  },

   {
    main: 'The manager chose John because he stood out from the __ candidates.',
    correct: 'other',
    options: ['others', 'other', 'another', 'anothers']
  },

   {
    main: '__ candidate had more experience, but he impressed them with his creativity.',
    correct: 'another',
    options: ['others', 'other', 'another', 'anothers']
  },

  {
    main: 'Even though he was new, he quickly found a way to contribute __ the team.',
    correct: 'to',
    options: ['in', 'into', 'to', 'with']
  },

  ,

  {
    main: 'It was stressed that the procuring entity was responsible __ such publication.',
    correct: 'for',
    options: ['in', 'for', 'to', 'of']
  },

   ,

  {
    main: 'Children should learn how to take care __ their pets.',
    correct: 'of',
    options: ['about', 'for', 'to', 'of']
  },

  {
    main: 'Poor sleep can negatively affect __ your concentration.',
    correct: '-',
    options: ['-', 'on', 'to', 'for']
  },

  ,

  {
    main: 'Our team worked hard, and we finally achieved __ main goal.',
    correct: 'the',
    options: ['-', 'a', 'an', 'the']
  },

  {
    main: 'The program was created to help __ people find work.',
    correct: 'these',
    options: ['this', 'that', 'these', 'those']
  },

   {
    main: 'The government should invest more in __ services for seniors.',
    correct: 'these',
    options: ['this', 'that', 'these', 'those']
  },

  {
    main: 'Gratitude helps people experience more positive __.',
    correct: 'feelings',
    options: ['emotions', 'feelings', 'thoughts', 'deliberation']
  },

   {
    main: 'Violent movies __ emotional well-being, especially in children.',
    correct: 'negatively affect',
    options: ['affect negatively', 'negatively affect', 'negatively affect on', 'affect negatively on']
  },

   {
    main: 'Violent movies negatively affect emotional well-being, especially __ children.',
    correct: 'in',
    options: ['in', 'on', 'for', 'to']
  },

  {
    main: 'We discussed the reasons __ his absence.',
    correct: 'for',
    options: ['of', 'on', 'for', 'to']
  },

  {
    main: 'I share my room with a student __ is very noisy.',
    correct: 'who',
    options: ['who', 'which', 'that', 'whose']
  },

    {
    main: 'I share my room with a student __ behavior is very noisy.',
    correct: 'whose',
    options: ['this', 'which', 'that', 'whose']
  },

    {
    main: 'I share my room with a student __ name is Marta .',
    correct: 'whose',
    options: ['who', 'which', 'that', 'whose']
  },

  {
    main: ' I have already __ to speak with her and find a solution, but my efforts were unsuccessful.',
    correct: 'tried',
    options: ['try', 'tried', 'tryed', 'whose']
  },

    {
    main: ' I have already tried to speak with her and find __ solution, but my efforts were unsuccessful.',
    correct: 'a',
    options: ['-', 'a', 'the', 'some']
  },

    {
    main: 'I need a __ place to study and relax.',
    correct: 'quiet',
    options: ['quite', 'quiet', 'quete', 'queit']
  },

    {
    main: 'I kindly ask you to help me __ this problem.',
    correct: 'with',
    options: ['-', 'for', 'in', 'with']
  },

  
    {
    main: 'I kindly ask you to help me __ this problem.',
    correct: 'with',
    options: ['-', 'for', 'in', 'with']
  },

    {
    main: 'I want to improve my English because I’m not good __ communication in this language yet.',
    correct: 'at',
    options: ['of', 'at', 'in', 'with']
  },

  
    {
    main: 'Poor time management negatively affected __ my final mark.',
    correct: '-',
    options: ['-', 'at', 'on', 'to']
  },

   {
    main: 'Poor time management negatively affected __ my final mark.',
    correct: '-',
    options: ['-', 'at', 'on', 'to']
  },

   {
    main: 'I couldn’t join the meeting today, but I’ll definitely help __ next time.',
    correct: '-',
    options: ['-', 'at', 'on', 'in']
  },

  {
    main: 'Thank you for doing it alone — I promise to help __ next time.',
    correct: '-',
    options: ['-', 'at', 'on', 'in']
  },

  
    {
    main: 'Don’t be afraid to __ help if you see someone struggling.',
    correct: 'offer',
    options: ['share', 'give', 'present', 'offer']
  },




































 




















];

