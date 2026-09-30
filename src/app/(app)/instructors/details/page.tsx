"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Star,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { MessageInstructorModal } from "@/components/instructors/message-instructor-modal";
import { InstructorStatusPill } from "@/components/instructors/status-pill";
import { InviteOverlay } from "@/components/invitations/invite-shell";
import { Avatar } from "@/components/shared/avatar";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type InstructorDetail,
  type InstructorReview,
  deleteInstructor,
  getInstructorDetail,
  listInstructorReviews,
  suspendInstructor,
  unsuspendInstructor,
} from "@/lib/api/instructors";
import { relativeTime } from "@/lib/api/students";
import { formatDateShort } from "@/lib/format";
import { useAdmin } from "@/lib/hooks/use-admin";
import { instructorPaths } from "@/lib/routes";

const LEVEL_BADGE = { bg: "#DBEAFE", color: "#1D4ED8" };

function SectionEmpty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Flex direction="column" align="center" justify="center" py="60px" gap={2} color="gray.400">
      <FileText size={30} />
      <Text fontSize="sm" fontWeight="semibold" color="gray.900">
        {title}
      </Text>
      <Text fontSize="sm">{subtitle}</Text>
    </Flex>
  );
}

function ReviewRow({ review, divider }: { review: InstructorReview; divider: boolean }) {
  return (
    <Stack gap={1} py={3.5} borderTopWidth={divider ? "1px" : 0} borderColor="gray.100">
      <Flex justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="semibold" color="gray.900">
          {review.studentName}
        </Text>
        <HStack gap={1}>
          <Star size={14} color="#F59E0B" fill="#F59E0B" />
          <Text fontSize="sm" color="gray.700">
            {review.rating}
          </Text>
        </HStack>
      </Flex>
      {review.courseTitle ? (
        <Text fontSize="xs" color="gray.500">
          on {review.courseTitle}
        </Text>
      ) : null}
      {review.comment ? (
        <Text fontSize="sm" color="gray.600">
          {review.comment}
        </Text>
      ) : null}
    </Stack>
  );
}

function AllReviewsModal({ instructorId, onClose }: { instructorId: string; onClose: () => void }) {
  const [reviews, setReviews] = useState<InstructorReview[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const result = await listInstructorReviews(instructorId, { page, limit: 6 });
    if (result.success) {
      setReviews(result.data.reviews);
      setTotalPages(result.data.totalPages || 1);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load reviews"));
    }
    setLoading(false);
  }, [instructorId, page]);

  useEffect(() => {
    const id = setTimeout(fetchReviews, 0);
    return () => clearTimeout(id);
  }, [fetchReviews]);

  return (
    <InviteOverlay onClose={onClose} maxW="520px">
      <Stack gap={2}>
        <Text fontSize="lg" fontWeight="bold" color="gray.900">
          Reviews
        </Text>
        {loading ? (
          <Stack gap={4} py={2}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} h="40px" rounded="md" />
            ))}
          </Stack>
        ) : reviews.length === 0 ? (
          <SectionEmpty title="No reviews yet" subtitle="Student reviews will appear here" />
        ) : (
          <Stack gap={0}>
            {reviews.map((r, i) => (
              <ReviewRow key={r.id} review={r} divider={i > 0} />
            ))}
          </Stack>
        )}
        <Flex justify="space-between" align="center" pt={2}>
          <Text fontSize="sm" color="gray.500">
            Page {page} of {totalPages}
          </Text>
          <HStack gap={2}>
            <Button variant="outline" size="sm" rounded="md" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" rounded="md" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </HStack>
        </Flex>
      </Stack>
    </InviteOverlay>
  );
}

function InstructorDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const instructorId = searchParams.get("instructorId");
  const { admin, loading: adminLoading } = useAdmin();

  const [detail, setDetail] = useState<InstructorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<
    "message" | "suspend" | "unsuspend" | "delete" | "reviews" | null
  >(null);
  const coursesRef = useRef<HTMLDivElement>(null);

  // Suspend/unsuspend/delete are admin+superadmin only.
  const canManage = admin?.role !== "instructor";

  const fetchDetail = useCallback(async () => {
    if (!instructorId) return;
    const result = await getInstructorDetail(instructorId);
    if (result.success) {
      setDetail(result.data);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load this instructor"));
    }
    setLoading(false);
  }, [instructorId]);

  useEffect(() => {
    const id = setTimeout(fetchDetail, 0);
    return () => clearTimeout(id);
  }, [fetchDetail]);

  const userChip = admin
    ? { name: `${admin.firstName} ${admin.lastName}`.trim(), role: roleLabel(admin.role) }
    : undefined;

  const scrollCourses = (dir: -1 | 1) =>
    coursesRef.current?.scrollBy({ left: dir * 560, behavior: "smooth" });

  const suspend = async () => {
    if (!instructorId) return;
    const result = await suspendInstructor(instructorId);
    if (result.success) {
      setModal(null);
      toast.success("Instructor suspended");
      fetchDetail();
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't suspend this instructor"));
    }
  };

  const unsuspend = async () => {
    if (!instructorId) return;
    const result = await unsuspendInstructor(instructorId);
    if (result.success) {
      setModal(null);
      toast.success("Instructor unsuspended");
      fetchDetail();
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't unsuspend this instructor"));
    }
  };

  const remove = async () => {
    if (!instructorId) return;
    const result = await deleteInstructor(instructorId);
    if (result.success) {
      toast.success("Instructor deleted");
      router.replace(instructorPaths.list);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't delete this instructor"));
    }
  };

  if (!instructorId) {
    return (
      <Box>
        <DashboardHeader title="Instructors" loading={adminLoading} user={userChip} />
        <Flex align="center" justify="center" py="200px">
          <Text color="gray.500">Instructor not found.</Text>
        </Flex>
      </Box>
    );
  }

  const instructor = detail?.instructor;
  const suspended = instructor?.status === "suspended";

  const statCards = detail
    ? [
        { label: "Students", value: String(detail.stats.students) },
        { label: "Rating", value: String(detail.stats.rating ?? 0) },
        { label: "Completion", value: `${detail.stats.completion}%` },
        { label: "Reviews", value: String(detail.stats.reviews) },
      ]
    : [];

  return (
    <Box>
      <DashboardHeader title="Instructors" loading={adminLoading} user={userChip} />

      <Box px={8} py={6}>
        {/* Top actions */}
        <Flex justify="space-between" align="center" mb={4}>
          <Box as="button" onClick={() => router.push(instructorPaths.list)} color="gray.700" cursor="pointer" _hover={{ color: "gray.900" }}>
            <ArrowLeft size={20} />
          </Box>
          <HStack gap={3}>
            {canManage ? (
              <>
                <Box as="button" onClick={() => setModal("delete")} color="#DC2626" fontSize="sm" fontWeight="medium" cursor="pointer" px={2} _hover={{ textDecoration: "underline" }}>
                  Delete
                </Box>
                <Button variant="outline" rounded="full" h="44px" px={6} fontWeight="medium" onClick={() => setModal(suspended ? "unsuspend" : "suspend")}>
                  {suspended ? "Unsuspend" : "Suspend"}
                </Button>
              </>
            ) : null}
            <Button bg="#2E2F6F" color="white" rounded="full" h="44px" px={6} fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => setModal("message")}>
              Message
            </Button>
          </HStack>
        </Flex>

        {/* Breadcrumb */}
        <HStack gap={2} mb={5} fontSize="sm">
          <Text as="button" color="gray.500" cursor="pointer" onClick={() => router.push(instructorPaths.list)} _hover={{ color: "gray.700" }}>
            Instructors
          </Text>
          <Text color="gray.400">›</Text>
          <Text color="gray.900" fontWeight="medium">
            {instructor?.name ?? "…"}
          </Text>
        </HStack>

        {/* Identity */}
        {loading || !instructor ? (
          <HStack gap={4} mb={6}>
            <Skeleton w="56px" h="56px" rounded="full" />
            <Stack gap={2}>
              <Skeleton h="20px" w="220px" rounded="md" />
              <Skeleton h="14px" w="300px" rounded="md" />
            </Stack>
          </HStack>
        ) : (
          <HStack gap={4} mb={6} align="flex-start">
            <Avatar name={instructor.name} src={instructor.avatarUrl} initials={instructor.initials} size={56} />
            <Stack gap={1}>
              <HStack gap={3}>
                <Heading as="h2" size="xl" color="gray.900">
                  {instructor.name}
                </Heading>
                <InstructorStatusPill status={instructor.status} />
              </HStack>
              <HStack gap={2} fontSize="sm" color="gray.500">
                <Text>{instructor.email}</Text>
                <Text>•</Text>
                <Text>Joined {formatDateShort(instructor.joinedAt)}</Text>
              </HStack>
            </Stack>
          </HStack>
        )}

        {/* Stats */}
        <Grid templateColumns="repeat(4, 1fr)" gap={4} mb={6}>
          {loading
            ? [...Array(4)].map((_, i) => <Skeleton key={i} h="110px" rounded="xl" />)
            : statCards.map((card) => (
                <Box key={card.label} bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={5}>
                  <Stack gap={3}>
                    <Text fontSize="sm" color="gray.700">
                      {card.label}
                    </Text>
                    <Heading as="p" size="2xl" color="gray.900" fontWeight="semibold">
                      {card.value}
                    </Heading>
                  </Stack>
                </Box>
              ))}
        </Grid>

        {/* Courses */}
        <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={6} mb={6}>
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontWeight="semibold" color="gray.900" fontSize="lg">
              Courses
            </Text>
            {detail && detail.courses.length > 0 ? (
              <HStack gap={2}>
                <Flex as="button" onClick={() => scrollCourses(-1)} w="34px" h="34px" rounded="full" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color="gray.600" cursor="pointer" _hover={{ bg: "gray.50" }}>
                  <ChevronLeft size={16} />
                </Flex>
                <Flex as="button" onClick={() => scrollCourses(1)} w="34px" h="34px" rounded="full" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color="gray.600" cursor="pointer" _hover={{ bg: "gray.50" }}>
                  <ChevronRight size={16} />
                </Flex>
              </HStack>
            ) : null}
          </Flex>
          {loading ? (
            <Grid templateColumns="1fr 1fr" gap={4}>
              <Skeleton h="160px" rounded="xl" />
              <Skeleton h="160px" rounded="xl" />
            </Grid>
          ) : !detail || detail.courses.length === 0 ? (
            <SectionEmpty title="No assigned courses yet" subtitle="Courses assigned to this instructor will appear here" />
          ) : (
            <Flex ref={coursesRef} gap={4} overflowX="auto" css={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
              {detail.courses.map((course) => (
                <Box key={course.courseId} flexShrink={0} w="calc(50% - 8px)" minW="320px" borderWidth="1px" borderColor="gray.200" rounded="xl" p={5}>
                  <Stack gap={2.5}>
                    <Box px={2.5} py={0.5} rounded="full" bg={LEVEL_BADGE.bg} color={LEVEL_BADGE.color} fontSize="xs" fontWeight="semibold" w="fit-content">
                      {course.level}
                    </Box>
                    <Text fontWeight="semibold" color="gray.900">
                      {course.title}
                    </Text>
                    <Text fontSize="sm" color="gray.500" lineClamp={2}>
                      {course.description}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {course.moduleCount} modules • {course.lessonCount} lessons • {course.duration}
                    </Text>
                    <HStack gap={3}>
                      <Box flex="1" bg="gray.100" rounded="full" h="7px">
                        <Box bg="#2E2F6F" rounded="full" h="7px" w={`${course.avgProgress}%`} />
                      </Box>
                      <Text fontSize="xs" color="gray.600" flexShrink={0}>
                        {course.avgProgress}%
                      </Text>
                    </HStack>
                  </Stack>
                </Box>
              ))}
            </Flex>
          )}
        </Box>

        {/* Reviews + Recent activity */}
        <Grid templateColumns="1fr 1fr" gap={6}>
          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={6}>
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontWeight="semibold" color="gray.900" fontSize="lg">
                Reviews
              </Text>
              {detail && detail.reviews.length > 0 ? (
                <Box as="button" onClick={() => setModal("reviews")} fontSize="sm" color="#4338CA" fontWeight="medium" cursor="pointer" _hover={{ textDecoration: "underline" }}>
                  View All
                </Box>
              ) : null}
            </Flex>
            {loading ? (
              <Stack gap={4} py={2}>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} h="44px" rounded="md" />
                ))}
              </Stack>
            ) : !detail || detail.reviews.length === 0 ? (
              <SectionEmpty title="No reviews yet" subtitle="Student reviews will appear here" />
            ) : (
              <Stack gap={0}>
                {detail.reviews.map((review, i) => (
                  <ReviewRow key={review.id} review={review} divider={i > 0} />
                ))}
              </Stack>
            )}
          </Box>

          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={6}>
            <Text fontWeight="semibold" color="gray.900" fontSize="lg" mb={2}>
              Recent Activity
            </Text>
            {loading ? (
              <Stack gap={4} py={2}>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} h="44px" rounded="md" />
                ))}
              </Stack>
            ) : !detail || detail.recentActivity.length === 0 ? (
              <SectionEmpty title="No activities yet" subtitle="Recent activities as they come in will appear here" />
            ) : (
              <Stack gap={0}>
                {detail.recentActivity.map((activity, i) => (
                  <Stack key={activity.id} gap={0.5} py={3.5} borderTopWidth={i > 0 ? "1px" : 0} borderColor="gray.100">
                    <Text fontSize="sm" fontWeight="medium" color="gray.900">
                      {activity.description}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {relativeTime(activity.occurredAt)}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </Grid>
      </Box>

      {/* Modals */}
      {modal === "message" && instructor ? (
        <MessageInstructorModal
          instructor={{
            id: instructor.id,
            name: instructor.name,
            email: instructor.email,
            avatarUrl: instructor.avatarUrl,
            initials: instructor.initials,
          }}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "suspend" && instructor ? (
        <ConfirmModal
          tone="warning"
          title="Suspend instructor?"
          body={
            <>
              Are you sure you want to suspend {instructor.name}? This will temporarily revoke their access to courses, lessons, and platform activities
            </>
          }
          confirmLabel="Suspend instructor"
          onConfirm={suspend}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "unsuspend" && instructor ? (
        <ConfirmModal
          tone="success"
          title="Unsuspend instructor?"
          body={
            <>
              Are you sure you want to unsuspend{" "}
              <Text as="span" fontWeight="semibold" color="gray.900">
                {instructor.name}
              </Text>
              ? This will restore the instructor&apos;s access to the platform immediately.
            </>
          }
          confirmLabel="Unsuspend instructor"
          onConfirm={unsuspend}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "delete" && instructor ? (
        <ConfirmModal
          tone="danger"
          title="Delete instructor?"
          body={
            <>
              Deleting{" "}
              <Text as="span" fontWeight="semibold" color="gray.900">
                {instructor.name}
              </Text>{" "}
              will permanently remove the instructor&apos;s account and data. This action cannot be undone.
            </>
          }
          confirmLabel="Delete instructor"
          onConfirm={remove}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "reviews" && instructorId ? (
        <AllReviewsModal instructorId={instructorId} onClose={() => setModal(null)} />
      ) : null}
    </Box>
  );
}

export default function InstructorDetailsPage() {
  return (
    <Suspense>
      <InstructorDetailsContent />
    </Suspense>
  );
}
