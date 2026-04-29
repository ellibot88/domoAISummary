import { useEffect, useState } from 'react';
import {
  Brain,
  Sparkles,
  Telescope,
  FlaskConical,
  Microscope,
  Compass,
  Wand2,
  BarChart3,
  Lightbulb,
  Search,
  Database,
  Atom,
  type LucideIcon,
} from 'lucide-react';

interface Props {
  generating?: boolean;
}

interface Activity {
  verb: string;
  icon: LucideIcon;
}

const GENERATING_ACTIVITIES: Activity[] = [
  { verb: 'Analyzing', icon: Microscope },
  { verb: 'Synthesizing', icon: FlaskConical },
  { verb: 'Pondering', icon: Brain },
  { verb: 'Divining', icon: Sparkles },
  { verb: 'Contextualizing', icon: Compass },
  { verb: 'Distilling', icon: Wand2 },
  { verb: 'Correlating', icon: BarChart3 },
  { verb: 'Illuminating', icon: Lightbulb },
  { verb: 'Investigating', icon: Search },
  { verb: 'Contemplating', icon: Telescope },
  { verb: 'Crunching', icon: Atom },
];

const LOADING_ACTIVITIES: Activity[] = [
  { verb: 'Connecting', icon: Database },
  { verb: 'Gathering', icon: Compass },
  { verb: 'Orienting', icon: Telescope },
];

const ROTATE_MS = 2400;

export default function LoadingState({ generating }: Props) {
  const activities = generating ? GENERATING_ACTIVITIES : LOADING_ACTIVITIES;
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setIndex(0);
    setElapsed(0);
    const startedAt = Date.now();

    const rotate = setInterval(() => {
      setIndex((i) => (i + 1) % activities.length);
    }, ROTATE_MS);

    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      clearInterval(rotate);
      clearInterval(tick);
    };
  }, [activities]);

  const current = activities[index];
  const Icon = current.icon;

  return (
    <div className="loading-container">
      <div className="thinking-pill" key={current.verb}>
        <Icon size={14} className="thinking-icon" />
        <span className="thinking-verb">{current.verb}…</span>
        <span className="thinking-elapsed">({elapsed}s)</span>
      </div>
    </div>
  );
}
