// Default state template
export function defaultState() {
  return {
    name: 'John Doe',
    title: 'Senior Software Engineer',
    location: 'San Francisco, CA',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    website: 'johndoe.dev',
    summary: 'Passionate software engineer with 5+ years of experience building scalable web applications and leading technical teams.',

    experience: [
      {
        company: 'Tech Corp',
        role: 'Senior Software Engineer',
        dates: '2020 - Present',
        location: 'San Francisco, CA',
        description: 'Led development of microservices architecture serving 10M+ users. Mentored junior developers and established best practices.',
      },
      {
        company: 'Startup Inc',
        role: 'Full Stack Developer',
        dates: '2018 - 2020',
        location: 'Remote',
        description: 'Built core product features using React and Node.js. Improved performance by 40% through optimization.',
      },
    ],

    skills: [
      { name: 'JavaScript', hearts: 5, category: 'technical' },
      { name: 'React', hearts: 5, category: 'technical' },
      { name: 'Node.js', hearts: 4, category: 'technical' },
      { name: 'Python', hearts: 4, category: 'technical' },
      { name: 'Leadership', hearts: 4, category: 'soft' },
      { name: 'Communication', hearts: 5, category: 'soft' },
    ],

    education: [
      {
        school: 'University of Technology',
        degree: 'B.S. Computer Science',
        dates: '2014 - 2018',
        location: 'Boston, MA',
      },
    ],

    languages: [
      { name: 'English', level: 'Native' },
      { name: 'Spanish', level: 'Intermediate' },
    ],

    gaming: {
      enabled: false,
      psnUsername: '',
      psnStats: null,
      steamId: '',
      steamStats: null,
    },

    layout: {
      columnSide: 'left',
      columnWidth: 30,
      columnColor: '#2d5016',
      columnOpacity: 100,
    },

    assets: {
      profilePhoto: '',
      bgImage: '',
    },

    fonts: {
      heading: 'Permanent Marker',
      body: 'Inter',
    },
  };
}

// Google Fonts list
export const FONT_OPTIONS = {
  heading: [
    'Permanent Marker',
    'Press Start 2P',
    'Bangers',
    'Righteous',
    'Bebas Neue',
  ],
  body: [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Avenir Next',
  ],
};
