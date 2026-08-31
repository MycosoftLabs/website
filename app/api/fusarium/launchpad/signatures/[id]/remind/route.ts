import { NextRequest, NextResponse } from 'next/server';

export { POST } from '../route';

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('..', request.url));
}
