import { auth } from '@/auth';

export async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  return userId || null;
}
