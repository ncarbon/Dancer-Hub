'use client';

import { useParams } from 'next/navigation';
import RoutineEditFlow from '@/components/routines/RoutineEditFlow';

export default function EditRoutinePage() {
  const { id } = useParams<{ id: string }>();
  return <RoutineEditFlow id={id} />;
}
