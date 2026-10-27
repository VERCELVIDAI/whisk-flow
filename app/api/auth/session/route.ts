import { errorResponse, requestContext } from "@/lib/errors";
import { getCurrentUser, authMode } from "@/lib/auth";
import { getProviderCatalog } from "@/lib/providers/models";
import { storageMode } from "@/lib/storage";

export async function GET(request: Request) {
  const context = requestContext(request, "auth.session");
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ user: null, authMode: authMode(), catalog: null });
    }
    return Response.json({
      user,
      authMode: authMode(),
      catalog: getProviderCatalog(authMode()),
      storageMode: storageMode(),
    });
  } catch (error) {
    return errorResponse(error, context);
  }
}
