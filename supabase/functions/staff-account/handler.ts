type StaffAccountAction = "create-staff-account";

interface StaffAccountBody {
  action?: StaffAccountAction;
  email?: string;
  name?: string;
  password?: string;
  restaurantSlug?: string;
  role?: string;
}

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface QueryBuilder<T> {
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  insert: (values: Record<string, unknown>) => QueryBuilder<T>;
  maybeSingle: () => Promise<QueryResult<T>>;
  select: (columns: string) => QueryBuilder<T>;
  single: () => Promise<QueryResult<T>>;
  update: (values: Record<string, unknown>) => QueryBuilder<T>;
}

interface SupabaseAdminClient {
  auth: {
    admin: {
      createUser: (attributes: {
        email: string;
        email_confirm: boolean;
        password: string;
        user_metadata: Record<string, unknown>;
      }) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
      deleteUser: (id: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    getUser: (jwt: string) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
  };
  from: <T = Record<string, unknown>>(table: string) => QueryBuilder<T>;
}

interface HandlerDependencies {
  createClient: (url: string, key: string, options?: unknown) => SupabaseAdminClient;
  env: Record<string, string | undefined>;
}

interface RestaurantRow {
  id: number;
}

interface StaffRow {
  active: boolean | null;
  email?: string | null;
  auth_user_id?: string | null;
  id?: number;
  role?: string | null;
}

const CORS_HEADERS = {
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-origin": "*",
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
    status,
  });
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isAllowedAction(action: unknown): action is StaffAccountAction {
  return action === "create-staff-account";
}

function normalizeRole(role: unknown): string {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

async function readJsonBody(request: Request): Promise<StaffAccountBody> {
  try {
    return await request.json() as StaffAccountBody;
  } catch {
    return {};
  }
}

async function querySingle<T>(query: QueryBuilder<T>): Promise<T | null> {
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function handleStaffAccountRequest(
  request: Request,
  dependencies: HandlerDependencies,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS, status: 204 });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { message: "method not allowed" });
  }

  const supabaseUrl = dependencies.env.SUPABASE_URL;
  const serviceRoleKey = dependencies.env.HARBOUR_SUPABASE_SERVICE_ROLE_KEY || dependencies.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { message: "staff account function is not configured" });
  }

  const body = await readJsonBody(request);
  const action = body.action;
  const email = normalizeEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = normalizeRole(body.role);
  const restaurantSlug = body.restaurantSlug?.trim() || "harbour-demo";

  if (!isAllowedAction(action)) return jsonResponse(400, { message: "invalid action" });
  if (!email) return jsonResponse(400, { message: "email is required" });
  if (!name) return jsonResponse(400, { message: "name is required" });
  if (!password) return jsonResponse(400, { message: "password is required" });
  if (!["manager", "cashier", "floor"].includes(role)) return jsonResponse(400, { message: "invalid role" });

  const token = getBearerToken(request);
  if (!token) return jsonResponse(401, { message: "authorization required" });

  const client = dependencies.createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user?.id) {
    return jsonResponse(401, { message: userError?.message || "invalid session" });
  }

  try {
    const restaurant = await querySingle<RestaurantRow>(
      client
        .from<RestaurantRow>("restaurants")
        .select("id")
        .eq("slug", restaurantSlug)
        .eq("active", true),
    );
    if (!restaurant) return jsonResponse(404, { message: "restaurant not found" });

    const currentStaff = await querySingle<StaffRow>(
      client
        .from<StaffRow>("staff_members")
        .select("active,role")
        .eq("restaurant_id", restaurant.id)
        .eq("auth_user_id", userData.user.id)
        .eq("active", true),
    );
    if (!currentStaff?.active || currentStaff.role !== "manager") {
      return jsonResponse(403, { message: "manager permission required" });
    }

    const targetStaff = await querySingle<StaffRow>(
      client
        .from<StaffRow>("staff_members")
        .select("id,active,email,auth_user_id")
        .eq("restaurant_id", restaurant.id)
        .eq("email", email),
    );
    if (targetStaff?.auth_user_id) return jsonResponse(409, { message: "staff account is already linked" });

    const createdUser = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { name, role },
    });
    if (createdUser.error || !createdUser.data.user?.id) {
      return jsonResponse(409, { message: createdUser.error?.message || "failed to create auth user" });
    }

    const authUserId = createdUser.data.user.id;
    const writeQuery = targetStaff?.id
      ? client
        .from("staff_members")
        .update({
          active: true,
          auth_user_id: authUserId,
          email,
          name,
          role,
        })
        .eq("id", targetStaff.id)
      : client
        .from("staff_members")
        .insert({
          active: true,
          auth_user_id: authUserId,
          client_id: authUserId,
          email,
          name,
          restaurant_id: restaurant.id,
          role,
        });

    const { error: writeError } = await writeQuery.select("id").single();
    if (writeError) {
      await client.auth.admin.deleteUser(authUserId);
      return jsonResponse(500, { message: writeError.message });
    }

    return jsonResponse(200, { action, email, ok: true });
  } catch (error) {
    return jsonResponse(500, { message: error instanceof Error ? error.message : "staff account request failed" });
  }
}
