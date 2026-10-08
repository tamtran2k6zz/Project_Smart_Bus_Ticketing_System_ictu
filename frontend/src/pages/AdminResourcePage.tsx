import { ResourceManager } from '@/features/operations/components/ResourceManager';
import type { Resource } from '@/features/operations/services/operations.api';
export default function AdminResourcePage({ resource }: { resource: Resource }) {
  return <ResourceManager resource={resource} />;
}
