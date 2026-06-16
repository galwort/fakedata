export const DEFAULT_TOPIC_ICON = 'category';

export interface TopicIconData {
  Material_Icon?: unknown;
}

export function iconForTopic(_id: string, data?: TopicIconData): string {
  const firestoreIcon =
    typeof data?.Material_Icon === 'string' ? data.Material_Icon.trim() : '';
  return firestoreIcon || DEFAULT_TOPIC_ICON;
}
