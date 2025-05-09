const wordPairs = [
  {
    main: 'He arrives __ the airport.',
    correct: 'at',
    options: ['to', 'at', 'in', 'into']
  },
  {
    main: 'She went __ the room and closed the door.',
    correct: 'into',
    options: ['in', 'to', 'into', 'onto']
  },
  {
    main: 'I don’t keep useless things __ home',
    correct: 'at',
    options: ['at', 'on', 'in', 'into']
  },
  {
    main: 'I swam in __ Lake Baikal during my trip to Siberia.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },
  {
    main: '__ Times Square is always crowded with tourists.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },
  {
    main: 'I study marketing at __ Carleton University',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },
  {
    main: 'She studied economics at __ University of British Columbia.',
    correct: 'the',
    options: ['-', 'a', 'an', 'the']
  },
  {
    main: 'She stood __ the bus stop.',
    correct: 'at',
    options: ['in', 'on', 'by', 'at']
  },
  {
    main: 'The cat jumped __ the bed.',
    correct: 'onto',
    options: ['into', 'on', 'onto', 'over']
  },
  {
    main: 'They walked __ the bridge.',
    correct: 'across',
    options: ['under', 'through', 'along', 'across']
  },
  {
    main: 'Please, calm __ — everything will be fine.',
    correct: 'down',
    options: ['up', 'down', 'out', 'off']
  },
  {
    main: 'Full-time working fathers __-earn their childless counterparts by more than a fifth, research suggests.',
    correct: 'out',
    options: ['up', 'down', 'out', 'off']
  },
  {
    main: 'The company has the right to lay __ if business is bad.',
    correct: 'off',
    options: ['up', 'down', 'out', 'off']
  },
  {
    main: 'You should take advantage __ this opportunity.',
    correct: 'of',
    options: ['at', 'to', 'on', 'of']
  },
  {
    main: 'I paid my taxes and __ the laws.',
    correct: 'obeyed',
    options: ['obeied', 'obet', 'obeyed', 'obed']
  },
  {
    main: 'Efficient methods of __ information are crucial in modern education.',
    correct: 'retrieving',
    options: ['retreiving', 'retrieving', 'retriving', 'retreving']
  },

  {
    main: '__ the hill the sun was setting in a clear sky.',
    correct: 'over',
    options: ['over', 'on', 'off', 'out']
  },
  
  {
    main: 'The boat was old and __.',
    correct: 'decrepit',
    options: ['desrepit', 'decrepit', 'decperit', 'desperit']
  },

  {
    main: 'She’s a __ child who learned to read at the age of three.',
    correct: 'precocious',
    options: ['precocius', 'precacious', 'precosious', 'precocious']
  },

  {
    main: 'Urban dwellers increasingly __ those living in rural areas',
    correct: 'outnumber',
    options: ['outnumber', 'outnumbered', 'out-number', 'out number']
  },

  {
    main: 'She __ all expectations in the exam.',
    correct: 'surpassed',
    options: ['surpassed', 'suprassed', 'surpased', 'surepassed']
  },

  {
    main: 'Concerns mount __ the lack of affordable housing.',
    correct: 'over',
    options: ['of', 'over', 'to', 'on']
  },

  {
    main: 'The __ of chaos can never be predicted',
    correct: 'outcome',
    options: ['comer', 'outcome', 'income', 'overcome']
  },

  {
    main: 'Their marriage began to __ after years of conflict.',
    correct: 'unravel',
    options: ['revel', 'unrevel', 'ravel', 'unravel']
  },

  
  {
    main: 'She has a __ voice that is easy to recognize.',
    correct: 'distinctive',
    options: ['destinctive', 'distinctive', 'destenctive', 'distenctive']
  },

  {
    main: 'I am __ to apply my academic knowledge in a real-world setting.',
    correct: 'eager',
    options: ['eagered', 'eager', 'aeger', 'eagar']
  },

  {
    main: 'Working at an art museum would allow me to __ my understanding of classical and contemporary art',
    correct: 'deepen',
    options: ['deepen', 'deep', 'deepens', 'deeper']
  },

  {
    main: 'She will arrive __ Canada next week.',
    correct: 'in',
    options: ['in', 'at', 'to', 'of']
  },

  {
    main: 'He drove __ the highway.',
    correct: 'along',
    options: ['on', 'across', 'to', 'along']
  },

  {
    main: 'I am writing to express my dissatisfaction __ a kitchen appliance I ordered from your website ',
    correct: 'with',
    options: ['about', 'with', 'to', 'from']
  },

  {
    main: 'Their skills __ each other perfectly.',
    correct: 'complement',
    options: ['complement', 'compliment', 'complete', 'complite']
  },

  {
    main: 'I have __ questions. Can I ask them now?',
    correct: 'a few',
    options: ['little', 'a little', 'a few', 'few']
  },

  {
    main: 'Only __ people came to the workshop, even though it was free.',
    correct: 'a few',
    options: ['a few', 'a little', 'some', 'one']
  },

  {
    main: 'I had __ water left in my bottle, so I didn’t feel thirsty.',
    correct: 'a little',
    options: ['a few', 'a little', 'few', 'little']
  },

  {
    main: 'The children had __ water after running in the heat.',
    correct: 'a little',
    options: ['a few', 'a little', 'few', 'little']
  },

  {
    main: 'There were __ snacks left by the time we arrived — nothing at all!',
    correct: 'no',
    options: ['some', 'no', 'few', 'little']
  },

  {
    main: 'We had __ snacks during the meeting, and everyone seemed happy.',
    correct: 'a few',
    options: ['a few', 'a little', 'few', 'little']
  },

  {
    main: 'We had __ snacks during the meeting, so most people stayed hungry.',
    correct: 'few',
    options: ['a few', 'a little', 'few', 'little']
  },

  {
    main: 'There were four people on the interview __, including the head of the department.',
    correct: 'panel',
    options: ['pane', 'panel', 'panelboard', 'panelling']
  },

  {
    main: 'His constant criticism finally drove her __.',
    correct: 'away',
    options: ['out', 'off', 'away', 'on']
  },

   {
    main: 'He was always __ around his boss, never challenging any decisions.',
    correct: 'submissive',
    options: ['assertive', 'submissive', 'impatient', 'rebellious']
  },

  {
    main: 'They had warned her not to interfere, but she still __ to question the council’s decision, risking punishment.',
    correct: 'dared',
    options: ['hesitated', 'refused', 'happened', 'dared']
  },

  {
    main: 'There isn’t __ clutter in the bedroom, but the living room is full of it.',
    correct: 'much',
    options: ['many', 'much', 'a lot', 'few']
  },

  {
    main: 'Try to clear the clutter __ your desk before the guests arrive.',
    correct: 'off',
    options: ['on', 'out', 'off', 'over']
  },

  {
    main: 'I need to clear __ my closet and donate the clothes I no longer wear.',
    correct: 'out',
    options: ['up', 'out', 'off', 'away']
  },

  {
    main: 'After the party, it took hours to clear __ all the decorations.',
    correct: 'away',
    options: ['up', 'out', 'off', 'away']
  },

  {
    main: 'How __ sauces do you usually serve with grilled meats?',
    correct: 'many',
    options: ['much', 'many', 'lot', 'a little']
  },

  {
    main: 'There is not __ sauce left for the pasta.',
    correct: 'much',
    options: ['much', 'some', 'a few', 'many']
  },

  
  {
    main: 'The bridge is still __ construction, so it hasn’t been built yet.',
    correct: '__',
    options: ['in', 'out of', 'on', 'under']
  },

  {
    main: 'The scientist had __ evidence to support her theory.',
    correct: 'ample',
    options: ['abundant', 'ample', 'rich', 'plenty']
  },


  {
    main: 'The region is known for its __ rainfall, making it ideal for farming.',
    correct: 'abundant',
    options: ['scarce', 'ample', 'abundant', 'sufficient']
  },

  {
    main: 'There was __ space in the hall for everyone to sit comfortably.',
    correct: 'ample',
    options: ['massive', 'crowded', 'ample', 'abundant']
  },

  {
    main: 'The forest was home to an __ variety of plant species.',
    correct: 'abundant',
    options: ['rare', 'ample', 'enough', 'abundant']
  },

  {
    main: 'There is __ variety in the market.',
    correct: 'a lot of',
    options: ['a lot of', 'a few', 'many', 'few']
  },

  {
    main: 'Our office is near__ Main Avenue.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },

  
  {
    main: 'You are planning to go __ camping this summer..',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },

  {
    main: 'You are planning to go __ camping this summer.',
    correct: '-',
    options: ['-', 'a', 'an', 'the']
  },
  {
    main: 'I’d love to __ you on the trip, but I’ll be busy.',
    correct: 'join',
    options: ['join', 'join to', 'join with', 'joint']
  },
  {
    main: 'Many people work long hours __ their own home.',
    correct: 'to afford',
    options: ['to afford', 'for affording', 'to affording', 'for to afford']
  },
  {
    main: '__ is a common problem among adults today.',
    correct: 'Insomnia',
    options: ['Insomnia', 'The insomnia', 'An insomnia', 'A insomnia']
  },
  {
    main: 'Lack of sleep has a negative impact __ your concentration.',
    correct: 'on',
    options: ['on', 'to', 'for', 'with']
  },
  {
    main: 'It’s important to have __ at night to recover.',
    correct: 'proper rest',
    options: ['proper rest', 'fulfillment rest', 'right rest', 'full rest']
  },
  {
    main: 'Before bed, I drink __ like herbal tea.',
    correct: 'decaffeinated beverages',
    options: ['decaffeinated beverages', 'decaffee beverages', 'decafinaded beverages', 'decafinated beveragies']
  },
  {
    main: 'Poor sleep habits can __ productivity.',
    correct: 'seriously affect',
    options: ['seriously affect', 'affect seriously on', 'seriously affecting on', 'affect on seriously']
  }


 




















];

