/**
 * One-click questionnaire presets for the Study Builder (Lab).
 * Verbatim item text from the researcher's questionnaire pack where applicable.
 */

export type PresetQuestion = {
  question: string;
  surveyType: "likert" | "mcq" | "open_text";
  scaleSize?: number;
  options?: string[];
  reversed?: boolean;
};

export type StudyPreset =
  | {
      key: string;
      label: string;
      description: string;
      blockLabel: string;
      scaleLabels?: string[];
      instruction?: string;
      questions: PresetQuestion[];
      brsItems?: undefined;
    }
  | {
      key: "brs";
      label: string;
      description: string;
      blockLabel: string;
      scaleLabels?: string[];
      instruction?: string;
      questions: [];
      brsItems: Array<{ text: string; reversed: boolean }>;
    };

const MSPSS_SCALE_LABELS = [
  "Very Strongly Disagree",
  "Strongly Disagree",
  "Mildly Disagree",
  "Neutral",
  "Mildly Agree",
  "Strongly Agree",
  "Very Strongly Agree",
];

export const QUESTIONNAIRE_LIBRARY: StudyPreset[] = [
  {
    key: "mspss",
    label: "MSPSS",
    description: "Multidimensional Scale of Perceived Social Support (12 items, 7-point)",
    blockLabel: "MSPSS — Perceived Social Support",
    instruction:
      "We are interested in how you feel about the following statements. Please read each statement carefully and indicate your level of agreement.",
    scaleLabels: MSPSS_SCALE_LABELS,
    questions: [
      { question: "There is a special person who is around when I am in need.", surveyType: "likert", scaleSize: 7 },
      { question: "There is a special person with whom I can share my joys and sorrows.", surveyType: "likert", scaleSize: 7 },
      { question: "My family really tries to help me.", surveyType: "likert", scaleSize: 7 },
      { question: "I get the emotional help and support I need from my family.", surveyType: "likert", scaleSize: 7 },
      { question: "I have a special person who is a real source of comfort to me.", surveyType: "likert", scaleSize: 7 },
      { question: "My friends really try to help me.", surveyType: "likert", scaleSize: 7 },
      { question: "I can count on my friends when things go wrong.", surveyType: "likert", scaleSize: 7 },
      { question: "I can talk about my problems with my family.", surveyType: "likert", scaleSize: 7 },
      { question: "I have friends with whom I can share my joys and sorrows.", surveyType: "likert", scaleSize: 7 },
      { question: "There is a special person in my life who cares about my feelings.", surveyType: "likert", scaleSize: 7 },
      { question: "My family is willing to help me make decisions.", surveyType: "likert", scaleSize: 7 },
      { question: "I can talk about my problems with my friends.", surveyType: "likert", scaleSize: 7 },
    ],
  },
  {
    key: "ius",
    label: "IUS",
    description: "Intolerance of Uncertainty Scale (27 items, 5-point)",
    blockLabel: "IUS — Intolerance of Uncertainty",
    instruction: "Please indicate how characteristic each statement is of you.",
    scaleLabels: [
      "Not at all characteristic of me",
      "Slightly characteristic",
      "Somewhat characteristic",
      "Very characteristic",
      "Entirely characteristic",
    ],
    questions: [
      { question: "Uncertainty stops me from having a firm opinion.", surveyType: "likert", scaleSize: 5 },
      { question: "Being uncertain means that a person is disorganized.", surveyType: "likert", scaleSize: 5 },
      { question: "Uncertainty makes life intolerable.", surveyType: "likert", scaleSize: 5 },
      { question: "It's unfair not having any guarantees in life.", surveyType: "likert", scaleSize: 5 },
      { question: "My mind can't relax if I don't know what will happen tomorrow.", surveyType: "likert", scaleSize: 5 },
      { question: "Uncertainty makes me uneasy, anxious, or stressed.", surveyType: "likert", scaleSize: 5 },
      { question: "Unforeseen events upset me greatly.", surveyType: "likert", scaleSize: 5 },
      { question: "It frustrates me not having all the information I need.", surveyType: "likert", scaleSize: 5 },
      { question: "Uncertainty keeps me from living a full life.", surveyType: "likert", scaleSize: 5 },
      { question: "One should always look ahead to avoid surprises.", surveyType: "likert", scaleSize: 5 },
      { question: "A small unforeseen event can spoil everything.", surveyType: "likert", scaleSize: 5 },
      { question: "When it's time to act, uncertainty paralyses me.", surveyType: "likert", scaleSize: 5 },
      { question: "Being uncertain means that I am not first-rate.", surveyType: "likert", scaleSize: 5 },
      { question: "When I am uncertain, I can't go forward.", surveyType: "likert", scaleSize: 5 },
      { question: "When I am uncertain, I can't function well.", surveyType: "likert", scaleSize: 5 },
      { question: "Others seem to know where they are going in life.", surveyType: "likert", scaleSize: 5 },
      { question: "Uncertainty makes me vulnerable, unhappy, or sad.", surveyType: "likert", scaleSize: 5 },
      { question: "I always want to know what the future holds.", surveyType: "likert", scaleSize: 5 },
      { question: "I can't stand being taken by surprise.", surveyType: "likert", scaleSize: 5 },
      { question: "The smallest doubt can stop me from acting.", surveyType: "likert", scaleSize: 5 },
      { question: "I should be able to organize everything in advance.", surveyType: "likert", scaleSize: 5 },
      { question: "Being uncertain means I lack confidence.", surveyType: "likert", scaleSize: 5 },
      { question: "It's unfair that others seem sure about their future.", surveyType: "likert", scaleSize: 5 },
      { question: "Uncertainty keeps me from sleeping well.", surveyType: "likert", scaleSize: 5 },
      { question: "I must avoid uncertain situations.", surveyType: "likert", scaleSize: 5 },
      { question: "Life's ambiguities stress me.", surveyType: "likert", scaleSize: 5 },
      { question: "I can't stand being undecided about my future.", surveyType: "likert", scaleSize: 5 },
    ],
  },
  {
    key: "mlq",
    label: "MLQ",
    description: "Meaning in Life Questionnaire — Presence & Search (10 items, 7-point)",
    blockLabel: "MLQ — Meaning in Life",
    scaleLabels: [
      "Absolutely Untrue",
      "Mostly Untrue",
      "Somewhat Untrue",
      "Neutral",
      "Somewhat True",
      "Mostly True",
      "Absolutely True",
    ],
    questions: [
      { question: "I understand my life's meaning.", surveyType: "likert", scaleSize: 7 },
      { question: "I am looking for something that makes my life meaningful.", surveyType: "likert", scaleSize: 7 },
      { question: "I am always searching for my life's purpose.", surveyType: "likert", scaleSize: 7 },
      { question: "My life has a clear sense of purpose.", surveyType: "likert", scaleSize: 7 },
      { question: "I have a good sense of what makes my life meaningful.", surveyType: "likert", scaleSize: 7 },
      { question: "I have discovered a satisfying life purpose.", surveyType: "likert", scaleSize: 7 },
      { question: "I am always searching for meaning.", surveyType: "likert", scaleSize: 7 },
      { question: "I am seeking a purpose or mission.", surveyType: "likert", scaleSize: 7 },
      { question: "My life has no clear purpose.", surveyType: "likert", scaleSize: 7, reversed: true },
      { question: "I am searching for meaning in my life.", surveyType: "likert", scaleSize: 7 },
    ],
  },
  {
    key: "psqi",
    label: "PSQI",
    description: "Pittsburgh Sleep Quality Index — adapted checklist (past month)",
    blockLabel: "PSQI — Sleep Quality (past month)",
    instruction: "Answer based on the past month.",
    scaleLabels: [
      "Not during the past month",
      "Less than once a week",
      "Once or twice a week",
      "Three or more times a week",
    ],
    questions: [
      { question: "Usual bedtime", surveyType: "open_text" },
      { question: "Time to fall asleep (minutes)", surveyType: "open_text" },
      { question: "Wake-up time", surveyType: "open_text" },
      { question: "Hours of sleep", surveyType: "open_text" },
      { question: "Hours in bed", surveyType: "open_text" },
      { question: "Difficulty falling asleep", surveyType: "likert", scaleSize: 4 },
      { question: "Wake during night", surveyType: "likert", scaleSize: 4 },
      { question: "Bathroom use", surveyType: "likert", scaleSize: 4 },
      { question: "Breathing issues", surveyType: "likert", scaleSize: 4 },
      { question: "Snoring/cough", surveyType: "likert", scaleSize: 4 },
      { question: "Feeling too cold", surveyType: "likert", scaleSize: 4 },
      { question: "Feeling too hot", surveyType: "likert", scaleSize: 4 },
      { question: "Bad dreams", surveyType: "likert", scaleSize: 4 },
      { question: "Pain", surveyType: "likert", scaleSize: 4 },
      { question: "Other sleep problems (frequency)", surveyType: "likert", scaleSize: 4 },
      { question: "Sleep medication use", surveyType: "likert", scaleSize: 4 },
      { question: "Trouble staying awake during the day", surveyType: "likert", scaleSize: 4 },
      { question: "Lack of enthusiasm to get things done", surveyType: "likert", scaleSize: 4 },
      {
        question: "Sleep quality",
        surveyType: "mcq",
        options: ["Very good", "Fairly good", "Fairly bad", "Very bad"],
      },
    ],
  },
  {
    key: "ahs",
    label: "AHS",
    description: "Adult Hope Scale (12 items, 8-point)",
    blockLabel: "AHS — Adult Hope Scale",
    scaleLabels: ["Definitely False", "2", "3", "4", "5", "6", "7", "Definitely True"],
    questions: [
      { question: "I can think of many ways out of a problem.", surveyType: "likert", scaleSize: 8 },
      { question: "I energetically pursue my goals.", surveyType: "likert", scaleSize: 8 },
      { question: "I feel tired most of the time.", surveyType: "likert", scaleSize: 8 },
      { question: "There are many ways around any problem.", surveyType: "likert", scaleSize: 8 },
      { question: "I am easily downed in an argument.", surveyType: "likert", scaleSize: 8 },
      { question: "I can achieve important things in life.", surveyType: "likert", scaleSize: 8 },
      { question: "I worry about my health.", surveyType: "likert", scaleSize: 8 },
      { question: "I can solve problems even when others are discouraged.", surveyType: "likert", scaleSize: 8 },
      { question: "My past prepared me well.", surveyType: "likert", scaleSize: 8 },
      { question: "I've been successful in life.", surveyType: "likert", scaleSize: 8 },
      { question: "I worry a lot.", surveyType: "likert", scaleSize: 8 },
      { question: "I meet my goals.", surveyType: "likert", scaleSize: 8 },
    ],
  },
  {
    key: "brs",
    label: "BRS",
    description:
      "Brief Resilience Scale (6 items, 5-point); default reverse-scoring on negatively worded items (editable)",
    blockLabel: "Brief Resilience Scale",
    instruction: "Please respond to each item by marking one box per row.",
    scaleLabels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    questions: [],
    brsItems: [
      { text: "I tend to bounce back quickly after hard times.", reversed: false },
      { text: "I have a hard time making it through stressful events.", reversed: true },
      { text: "It does not take me long to recover from stress.", reversed: false },
      { text: "It is hard for me to snap back after something bad happens.", reversed: true },
      { text: "I take a long time to recover from setbacks.", reversed: true },
      { text: "I usually come through difficult times easily.", reversed: false },
    ],
  },
  {
    key: "fear_of_war",
    label: "Fear of War",
    description: "Fear of War scale (13 items, 5-point)",
    blockLabel: "Fear of War Scale",
    scaleLabels: ["Agree", "2", "3", "4", "Not agree at all"],
    questions: [
      { question: "I am scared because war costs human lives.", surveyType: "likert", scaleSize: 5 },
      { question: "I fear the war will last long.", surveyType: "likert", scaleSize: 5 },
      { question: "I fear peace talks will fail.", surveyType: "likert", scaleSize: 5 },
      { question: "I am afraid the world will become unsafe.", surveyType: "likert", scaleSize: 5 },
      { question: "Thinking about war makes me uncomfortable.", surveyType: "likert", scaleSize: 5 },
      { question: "I worry about war consequences.", surveyType: "likert", scaleSize: 5 },
      { question: "I fear nuclear war.", surveyType: "likert", scaleSize: 5 },
      { question: "I tremble thinking war may reach us.", surveyType: "likert", scaleSize: 5 },
      { question: "My palms sweat thinking about war.", surveyType: "likert", scaleSize: 5 },
      { question: "My heart beats faster thinking about war.", surveyType: "likert", scaleSize: 5 },
      { question: "I have sleep problems due to war worries.", surveyType: "likert", scaleSize: 5 },
      { question: "I get goosebumps thinking about war.", surveyType: "likert", scaleSize: 5 },
      { question: "I feel sick thinking about war.", surveyType: "likert", scaleSize: 5 },
    ],
  },
  {
    key: "dass21",
    label: "DASS-21",
    description: "Depression, Anxiety, and Stress Scales (21 items, 4-point)",
    blockLabel: "DASS-21 — Mood Screening",
    instruction:
      "Please read each statement and indicate how much the statement applied to you over the past week. There are no right or wrong answers. Do not spend too much time on any statement.",
    scaleLabels: [
      "Did not apply to me at all",
      "Applied to me to some degree",
      "Applied to me to a considerable degree",
      "Applied to me very much / most of the time",
    ],
    questions: [
      { question: "I found it hard to wind down", surveyType: "likert", scaleSize: 4 },
      { question: "I was aware of dryness of my mouth", surveyType: "likert", scaleSize: 4 },
      { question: "I couldn't seem to experience any positive feeling at all", surveyType: "likert", scaleSize: 4 },
      {
        question:
          "I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)",
        surveyType: "likert",
        scaleSize: 4,
      },
      { question: "I found it difficult to work up the initiative to do things", surveyType: "likert", scaleSize: 4 },
      { question: "I tended to over-react to situations", surveyType: "likert", scaleSize: 4 },
      { question: "I experienced trembling (e.g. in the hands)", surveyType: "likert", scaleSize: 4 },
      { question: "I felt that I was using a lot of nervous energy", surveyType: "likert", scaleSize: 4 },
      {
        question: "I was worried about situations in which I might panic and make a fool of myself",
        surveyType: "likert",
        scaleSize: 4,
      },
      { question: "I felt that I had nothing to look forward to", surveyType: "likert", scaleSize: 4 },
      { question: "I found myself getting agitated", surveyType: "likert", scaleSize: 4 },
      { question: "I found it difficult to relax", surveyType: "likert", scaleSize: 4 },
      { question: "I felt down-hearted and blue", surveyType: "likert", scaleSize: 4 },
      {
        question: "I was intolerant of anything that kept me from getting on with what I was doing",
        surveyType: "likert",
        scaleSize: 4,
      },
      { question: "I felt I was close to panic", surveyType: "likert", scaleSize: 4 },
      { question: "I was unable to become enthusiastic about anything", surveyType: "likert", scaleSize: 4 },
      { question: "I felt I wasn't worth much as a person", surveyType: "likert", scaleSize: 4 },
      { question: "I felt that I was rather touchy", surveyType: "likert", scaleSize: 4 },
      {
        question:
          "I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)",
        surveyType: "likert",
        scaleSize: 4,
      },
      { question: "I felt scared without any good reason", surveyType: "likert", scaleSize: 4 },
      { question: "I felt that life was meaningless", surveyType: "likert", scaleSize: 4 },
    ],
  },
  {
    key: "gad7",
    label: "GAD-7",
    description: "Generalized Anxiety Disorder (7 items, 4-point)",
    blockLabel: "GAD-7 — Anxiety Screening",
    instruction: "Over the last 2 weeks, how often have you been bothered by the following problems?",
    scaleLabels: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    questions: [
      { question: "Feeling nervous, anxious, or on edge", surveyType: "likert", scaleSize: 4 },
      { question: "Not being able to stop or control worrying", surveyType: "likert", scaleSize: 4 },
      { question: "Worrying too much about different things", surveyType: "likert", scaleSize: 4 },
      { question: "Trouble relaxing", surveyType: "likert", scaleSize: 4 },
      { question: "Being so restless that it is hard to sit still", surveyType: "likert", scaleSize: 4 },
      { question: "Becoming easily annoyed or irritable", surveyType: "likert", scaleSize: 4 },
      { question: "Feeling afraid as if something awful might happen", surveyType: "likert", scaleSize: 4 },
    ],
  },
  {
    key: "perma",
    label: "PERMA",
    description: "PERMA Well-being Profiler (15 items, 11-point)",
    blockLabel: "PERMA — Well-being Profile",
    instruction: "Please respond to each question based on how you have been feeling lately.",
    scaleLabels: [
      "0 - Not at all",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10 - Completely",
    ],
    questions: [
      { question: "In general, how often do you feel joyful?", surveyType: "likert", scaleSize: 11 },
      { question: "In general, how often do you feel positive?", surveyType: "likert", scaleSize: 11 },
      { question: "In general, how often do you feel contented?", surveyType: "likert", scaleSize: 11 },
      { question: "How often do you become absorbed in what you are doing?", surveyType: "likert", scaleSize: 11 },
      {
        question: "In general, to what extent do you feel excited and interested in things?",
        surveyType: "likert",
        scaleSize: 11,
      },
      {
        question: "How often do you lose track of time while you are doing something you enjoy?",
        surveyType: "likert",
        scaleSize: 11,
      },
      {
        question: "To what extent do you receive help and support from others when you need it?",
        surveyType: "likert",
        scaleSize: 11,
      },
      { question: "To what extent do you feel loved?", surveyType: "likert", scaleSize: 11 },
      { question: "How satisfied are you with your personal relationships?", surveyType: "likert", scaleSize: 11 },
      {
        question: "To what extent do you feel that what you do in your life is valuable and worthwhile?",
        surveyType: "likert",
        scaleSize: 11,
      },
      {
        question: "In general, to what extent do you feel that your life has a sense of direction?",
        surveyType: "likert",
        scaleSize: 11,
      },
      { question: "To what extent do you feel that your life has a sense of purpose?", surveyType: "likert", scaleSize: 11 },
      {
        question: "How much of the time do you feel you are making progress towards accomplishing your goals?",
        surveyType: "likert",
        scaleSize: 11,
      },
      {
        question: "How often do you achieve the important goals you have set for yourself?",
        surveyType: "likert",
        scaleSize: 11,
      },
      { question: "To what extent do you feel able to handle your responsibilities?", surveyType: "likert", scaleSize: 11 },
    ],
  },
];
