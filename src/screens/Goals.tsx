import { GoalsForm } from '../components/GoalsForm';
import { useRootNav } from '../navigation';

export default function Goals() {
  const navigation = useRootNav();
  return <GoalsForm onSaved={() => navigation.goBack()} />;
}
