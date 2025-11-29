import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateEventStatusAction } from "@/app/admin/feedback/actions";
import { auth } from "@/auth";
import { db } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  events: {} as any,
  users: {} as any,
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockAuth = auth as unknown as vi.Mock;
const mockUsersFind = db.query.users.findFirst as unknown as vi.Mock;
const mockDbUpdate = db.update as unknown as vi.Mock;
const mockRevalidate = revalidatePath as unknown as vi.Mock;
const mockRedirect = redirect as unknown as vi.Mock;

function setupUpdate() {
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  mockDbUpdate.mockReturnValue({ set });
  return { set, where };
}

describe("updateEventStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid id", async () => {
    const res = await updateEventStatusAction(new FormData());
    (res as any).id = -1;
    expect(res.error).toBeDefined();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid status", async () => {
    const fd = new FormData();
    fd.set("id", "1");
    fd.set("status", "bad");
    const res = await updateEventStatusAction(fd);
    expect(res.error).toBeDefined();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    mockAuth.mockResolvedValue({ user: null });
    const fd = new FormData();
    fd.set("id", "1");
    fd.set("status", "done");
    const res = await updateEventStatusAction(fd);
    expect(res.error).toBe("Not signed in");
  });

  it("rejects non-admin users", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockUsersFind.mockResolvedValue({ admin: false });
    const fd = new FormData();
    fd.set("id", "1");
    fd.set("status", "done");
    const res = await updateEventStatusAction(fd);
    expect(res.error).toBe("Not authorized");
  });

  it("updates status and revalidates for admins", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockUsersFind.mockResolvedValue({ admin: true });
    const { set, where } = setupUpdate();

    const fd = new FormData();
    fd.set("id", "42");
    fd.set("status", "archived");
    await updateEventStatusAction(fd);
    expect(set).toHaveBeenCalledWith({ status: "archived" });
    expect(where).toHaveBeenCalled();
    expect(mockRevalidate).toHaveBeenCalledWith("/admin/feedback");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/feedback?status=archived");
  });
});
