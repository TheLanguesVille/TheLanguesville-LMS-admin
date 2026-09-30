"use client";

import { roleLabel } from "@/lib/api/auth";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  IconButton,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Portal,
} from "@chakra-ui/react";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Copy,
  Star,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { useAdmin } from "@/lib/hooks/use-admin";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { coursePaths, studentPaths } from "@/lib/routes";
import {
  type ApiCourse,
  type ApiModuleDetail,
  type CourseCohortData,
  type CourseReviewsData,
  getCourse,
  getCourseCohort,
  listCourseReviews,
  deleteCourse,
  duplicateCourse,
  publishCourse,
  unpublishCourse,
} from "@/lib/api/courses";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" rounded="xl" p={5}>
      <Text fontSize="sm" color="gray.500" mb={3}>
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color="gray.900">
        {value}
      </Text>
    </Box>
  );
}

function ModuleRow({
  mod,
  index,
  courseId,
}: {
  mod: ApiModuleDetail;
  index: number;
  courseId: string;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      rounded="xl"
      bg="white"
      overflow="hidden"
    >
      <Flex
        align="center"
        justify="space-between"
        px={5}
        py={4}
        cursor="pointer"
        onClick={() => setCollapsed((v) => !v)}
        _hover={{ bg: "gray.50" }}
      >
        <HStack gap={3}>
          <IconButton
            aria-label={collapsed ? "Expand" : "Collapse"}
            variant="ghost"
            size="xs"
            color="gray.400"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((v) => !v);
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </IconButton>
          <Stack gap={0}>
            <Text fontSize="xs" color="gray.400" fontWeight="medium">
              Module {index + 1}
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="gray.900">
              {mod.title}
            </Text>
          </Stack>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
        </Text>
      </Flex>

      {!collapsed &&
        mod.lessons.map((lesson, li) => (
          <Flex
            key={lesson._id}
            align="center"
            justify="space-between"
            px={5}
            py={3}
            borderTopWidth="1px"
            borderColor="gray.100"
            cursor="pointer"
            _hover={{ bg: "gray.50" }}
            onClick={() => router.push(coursePaths.lesson(courseId, lesson._id))}
          >
            <HStack gap={3}>
              <Text
                fontSize="sm"
                color="gray.400"
                minW="24px"
                fontWeight="medium"
              >
                {String(li + 1).padStart(2, "0")}
              </Text>
              <BookOpen size={14} color="#6B7280" />
              <Text fontSize="sm" color="gray.900" fontWeight="medium">
                {lesson.title}
              </Text>
            </HStack>
            <ChevronRight size={16} color="#9CA3AF" />
          </Flex>
        ))}
    </Box>
  );
}

const COHORT_PAGE_SIZE = 8;

/** Per-student completion for everyone enrolled in the course. */
function CohortProgressSection({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { has } = usePermissions();
  const canViewStudents = has("students.view");
  const [data, setData] = useState<CourseCohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await getCourseCohort(courseId, {
        page: 1,
        limit: COHORT_PAGE_SIZE,
      });
      if (cancelled) return;
      if (result.success) setData(result.data);
      else toast.error(result.message || "Couldn't load cohort progress");
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const loadMore = async () => {
    if (!data) return;
    setLoadingMore(true);
    const result = await getCourseCohort(courseId, {
      page: data.page + 1,
      limit: COHORT_PAGE_SIZE,
    });
    if (result.success) {
      setData({
        ...result.data,
        students: [...data.students, ...result.data.students],
      });
    } else {
      toast.error(result.message || "Couldn't load cohort progress");
    }
    setLoadingMore(false);
  };

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" rounded="xl" p={5}>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontWeight="semibold" fontSize="md" color="gray.900">
          Cohort Progress
        </Text>
        {data && data.total > 0 ? (
          <Text fontSize="xs" color="gray.500">
            {data.completed}/{data.total} completed
          </Text>
        ) : null}
      </Flex>

      {loading ? (
        <Stack gap={4}>
          {[...Array(3)].map((_, i) => (
            <Stack key={i} gap={1}>
              <Skeleton height="13px" width="80px" rounded="md" />
              <Skeleton height="8px" rounded="full" />
            </Stack>
          ))}
        </Stack>
      ) : !data || data.total === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No students enrolled yet.
        </Text>
      ) : (
        <Stack gap={4}>
          {data.students.map((s) => (
            <Stack
              key={s.id}
              gap={1}
              cursor={canViewStudents ? "pointer" : undefined}
              onClick={
                canViewStudents
                  ? () => router.push(studentPaths.details(s.id))
                  : undefined
              }
            >
              <Flex justify="space-between" align="center" gap={2}>
                <Text
                  fontSize="sm"
                  color="gray.700"
                  truncate
                  _hover={canViewStudents ? { color: "#2E2F6F" } : undefined}
                >
                  {s.name || "Unnamed student"}
                </Text>
                {s.status === "completed" ? (
                  <Text fontSize="xs" color="#16A34A" fontWeight="medium">
                    Completed
                  </Text>
                ) : null}
              </Flex>
              <Flex align="center" gap={3}>
                <Box flex="1" bg="gray.100" rounded="full" h="8px">
                  <Box
                    bg="#2E2F6F"
                    rounded="full"
                    h="8px"
                    w={`${s.progress}%`}
                    transition="width 0.4s"
                  />
                </Box>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  minW="36px"
                  textAlign="right"
                >
                  {s.progress}%
                </Text>
              </Flex>
            </Stack>
          ))}

          {data.page < data.totalPages ? (
            <Button
              variant="outline"
              size="sm"
              rounded="md"
              fontWeight="medium"
              loading={loadingMore}
              onClick={loadMore}
            >
              Load more
            </Button>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}

const REVIEWS_PAGE_SIZE = 5;

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <HStack gap={0.5}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color="#F59E0B"
          fill={n <= Math.round(rating) ? "#F59E0B" : "transparent"}
        />
      ))}
    </HStack>
  );
}

/** Student ratings & feedback, written from the student portal. */
function CourseReviewsSection({ courseId }: { courseId: string }) {
  const [data, setData] = useState<CourseReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await listCourseReviews(courseId, {
        page: 1,
        limit: REVIEWS_PAGE_SIZE,
      });
      if (cancelled) return;
      if (result.success) setData(result.data);
      else toast.error(result.message || "Couldn't load reviews");
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const loadMore = async () => {
    if (!data) return;
    setLoadingMore(true);
    const result = await listCourseReviews(courseId, {
      page: data.page + 1,
      limit: REVIEWS_PAGE_SIZE,
    });
    if (result.success) {
      setData({
        ...result.data,
        reviews: [...data.reviews, ...result.data.reviews],
      });
    } else {
      toast.error(result.message || "Couldn't load reviews");
    }
    setLoadingMore(false);
  };

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" rounded="xl" p={5}>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontWeight="semibold" fontSize="md" color="gray.900">
          Reviews
        </Text>
        {data && data.total > 0 ? (
          <Text fontSize="xs" color="gray.500">
            {data.total} total
          </Text>
        ) : null}
      </Flex>

      {loading ? (
        <Stack gap={3}>
          <Skeleton height="28px" width="120px" rounded="md" />
          <Skeleton height="14px" rounded="md" />
          <Skeleton height="14px" width="70%" rounded="md" />
        </Stack>
      ) : !data || data.total === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No reviews yet. Students can rate this course from their course
          page.
        </Text>
      ) : (
        <Stack gap={4}>
          <HStack gap={3} align="center">
            <Text fontSize="3xl" fontWeight="bold" color="gray.900" lineHeight={1}>
              {data.average?.toFixed(1)}
            </Text>
            <Stack gap={1}>
              <Stars rating={data.average ?? 0} />
              <Text fontSize="xs" color="gray.500">
                {data.total} review{data.total !== 1 ? "s" : ""}
              </Text>
            </Stack>
          </HStack>

          <Stack gap={1.5}>
            {(["5", "4", "3", "2", "1"] as const).map((star) => {
              const count = data.breakdown[star];
              return (
                <Flex key={star} align="center" gap={2}>
                  <Text fontSize="xs" color="gray.600" w="10px">
                    {star}
                  </Text>
                  <Box flex="1" bg="gray.100" rounded="full" h="6px">
                    <Box
                      bg="#F59E0B"
                      rounded="full"
                      h="6px"
                      w={`${(count / data.total) * 100}%`}
                    />
                  </Box>
                  <Text fontSize="xs" color="gray.500" minW="20px" textAlign="right">
                    {count}
                  </Text>
                </Flex>
              );
            })}
          </Stack>

          <Stack gap={0}>
            {data.reviews.map((review) => (
              <Stack
                key={review.id}
                gap={1}
                py={3}
                borderTopWidth="1px"
                borderColor="gray.100"
              >
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                    {review.studentName}
                  </Text>
                  <HStack gap={1.5}>
                    <Stars rating={review.rating} size={12} />
                    <Text fontSize="xs" color="gray.600">
                      {review.rating}
                    </Text>
                  </HStack>
                </Flex>
                <Text fontSize="xs" color="gray.400">
                  {new Date(review.updatedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
                {review.comment ? (
                  <Text fontSize="sm" color="gray.600">
                    {review.comment}
                  </Text>
                ) : null}
              </Stack>
            ))}
          </Stack>

          {data.page < data.totalPages ? (
            <Button
              variant="outline"
              size="sm"
              rounded="md"
              fontWeight="medium"
              loading={loadingMore}
              onClick={loadMore}
            >
              Load more
            </Button>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}

function CourseDetailContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? "";
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const { has } = usePermissions();
  const canEdit = has("courses.edit");

  useEffect(() => {
    if (!courseId) {
      router.replace(coursePaths.list);
      return;
    }
    async function load() {
      setLoading(true);
      const result = await getCourse(courseId);
      if (result.success) {
        setCourse(result.data);
      } else {
        toast.error(result.message || "Failed to load course");
        router.push(coursePaths.list);
      }
      setLoading(false);
    }
    void load();
  }, [courseId, router]);

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    setActionLoading(true);
    const result = await deleteCourse(courseId);
    if (result.success) {
      toast.success("Course deleted");
      router.push(coursePaths.list);
    } else {
      toast.error(result.message || "Failed to delete course");
      setActionLoading(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    const result = await duplicateCourse(courseId);
    setShowDuplicateModal(false);
    if (result.success) {
      toast.success("Course duplicated — you're now viewing the copy");
      router.push(coursePaths.details(result.data._id));
    } else {
      toast.error(result.message || "Failed to duplicate course");
    }
  };

  const handlePublish = async () => {
    if (!course) return;
    setActionLoading(true);
    const result = await publishCourse(courseId);
    if (result.success) {
      setCourse(result.data);
      toast.success("Course published!");
    } else {
      toast.error(result.message || "Failed to publish");
    }
    setActionLoading(false);
  };

  const handleConfirmUnpublish = async () => {
    setShowUnpublishModal(false);
    setActionLoading(true);
    const result = await unpublishCourse(courseId);
    if (result.success) {
      setCourse(result.data);
      toast.success("Course unpublished");
    } else {
      toast.error(result.message || "Failed to unpublish");
    }
    setActionLoading(false);
  };

  const totalLessons =
    course?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0;

  return (
    <Box>
      <DashboardHeader
        title="Courses"
        loading={adminLoading}
        user={
          admin
            ? {
                name: `${admin.firstName} ${admin.lastName}`.trim(),
                role: roleLabel(admin.role),
              }
            : undefined
        }
      />

      <Box px={8} py={6}>
        {/* Back + actions row */}
        <Flex align="center" justify="space-between" mb={4}>
          <IconButton
            aria-label="Back"
            variant="ghost"
            size="sm"
            onClick={() => router.push(coursePaths.list)}
          >
            <ArrowLeft size={18} />
          </IconButton>

          {loading ? null : (
            <HStack gap={2}>
              <Button
                variant="ghost"
                color="#DC2626"
                fontWeight="semibold"
                fontSize="sm"
                h="36px"
                px={4}
                _hover={{ bg: "red.50" }}
                loading={actionLoading}
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </Button>
              {canEdit ? (
                <Button
                  variant="outline"
                  fontWeight="semibold"
                  fontSize="sm"
                  h="36px"
                  px={4}
                  rounded="md"
                  disabled={actionLoading}
                  onClick={() => setShowDuplicateModal(true)}
                >
                  <Copy size={15} />
                  Duplicate
                </Button>
              ) : null}
              <Button
                variant="outline"
                fontWeight="semibold"
                fontSize="sm"
                h="36px"
                px={4}
                rounded="md"
                onClick={() => router.push(coursePaths.edit(courseId))}
              >
                Edit
              </Button>
              <Button
                bg="#2E2F6F"
                color="white"
                fontWeight="semibold"
                fontSize="sm"
                h="36px"
                px={4}
                rounded="md"
                _hover={{ bg: "#262760" }}
                loading={actionLoading}
                onClick={
                  course?.status === "published"
                    ? () => setShowUnpublishModal(true)
                    : handlePublish
                }
              >
                {course?.status === "published" ? "Unpublish" : "Publish"}
              </Button>
            </HStack>
          )}
        </Flex>

        {/* Breadcrumb */}
        {loading ? (
          <Skeleton height="14px" width="180px" rounded="md" mb={3} />
        ) : (
          <HStack gap={2} mb={3} fontSize="sm">
            <Text
              color="#2E2F6F"
              fontWeight="medium"
              cursor="pointer"
              onClick={() => router.push(coursePaths.list)}
              _hover={{ textDecoration: "underline" }}
            >
              Courses
            </Text>
            <ChevronRight size={14} color="#9CA3AF" />
            <Text color="gray.700" fontWeight="medium">
              {course?.title}
            </Text>
          </HStack>
        )}

        {/* Course meta */}
        {loading ? (
          <Stack gap={2} mb={6}>
            <Skeleton height="14px" width="220px" rounded="md" />
            <Skeleton height="28px" width="300px" rounded="md" />
            <Skeleton height="14px" width="480px" rounded="md" />
          </Stack>
        ) : (
          <Stack gap={1} mb={6}>
            <HStack gap={2} fontSize="sm" color="gray.500">
              <Text>
                {course?.modules.length} module
                {course?.modules.length !== 1 ? "s" : ""}
              </Text>
              <Text>•</Text>
              <Text>
                {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
              </Text>
              <Text>•</Text>
              <Text>{course?.duration}</Text>
            </HStack>
            <Heading as="h2" size="lg" color="gray.900">
              {course?.title}
            </Heading>
            <Text fontSize="sm" color="gray.500" maxW="800px">
              {course?.description}
            </Text>
          </Stack>
        )}

        {/* Stat cards */}
        {loading ? (
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
            {[...Array(4)].map((_, i) => (
              <Box
                key={i}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                rounded="xl"
                p={5}
              >
                <Skeleton height="14px" width="80px" rounded="md" mb={3} />
                <Skeleton height="32px" width="60px" rounded="md" />
              </Box>
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
            <StatCard label="Students" value={course?.enrolledCount ?? 0} />
            <StatCard
              label="Avg Completion"
              value={`${Math.round(course?.completionRate ?? 0)}%`}
            />
            <StatCard label="Course Level" value={course?.level ?? "—"} />
            <StatCard label="Lessons" value={totalLessons} />
          </SimpleGrid>
        )}

        {/* Modules + cohort */}
        <Flex gap={5} align="flex-start">
          <Stack flex="1" gap={4} minW={0}>
            {loading
              ? [...Array(3)].map((_, i) => (
                  <Box
                    key={i}
                    bg="white"
                    borderWidth="1px"
                    borderColor="gray.200"
                    rounded="xl"
                    p={5}
                  >
                    <Skeleton height="16px" width="40%" rounded="md" mb={2} />
                    <Skeleton height="14px" width="60%" rounded="md" />
                  </Box>
                ))
              : course?.modules.map((mod, idx) => (
                  <ModuleRow
                    key={mod._id}
                    mod={mod}
                    index={idx}
                    courseId={courseId}
                  />
                ))}
          </Stack>

          <Stack w="320px" flexShrink={0} gap={5}>
            {courseId ? <CohortProgressSection courseId={courseId} /> : null}
            {courseId ? <CourseReviewsSection courseId={courseId} /> : null}
          </Stack>
        </Flex>
      </Box>

      {showDuplicateModal && course ? (
        <ConfirmModal
          tone="info"
          title="Duplicate this course?"
          body={
            <>
              A new draft copy of <b>{course.title}</b> will be created with
              its details, modules, lessons and content. Students, reviews
              and assignments stay with the original.
            </>
          }
          confirmLabel="Duplicate course"
          onConfirm={handleConfirmDuplicate}
          onClose={() => setShowDuplicateModal(false)}
        />
      ) : null}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <Portal>
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.600"
            zIndex={200}
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={4}
            onClick={() => setShowDeleteModal(false)}
          >
            <Box
              bg="white"
              rounded="2xl"
              p={8}
              w="full"
              maxW="440px"
              boxShadow="2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Stack gap={5} align="center" textAlign="center">
                <Box
                  w="56px"
                  h="56px"
                  rounded="full"
                  bg="#FEE2E2"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <AlertTriangle size={26} color="#DC2626" />
                </Box>
                <Stack gap={2}>
                  <Heading as="h3" size="md" color="gray.900">
                    Delete Course?
                  </Heading>
                  <Text fontSize="sm" color="gray.500" lineHeight="1.6">
                    Are you sure you want to delete{" "}
                    <strong>{course?.title}</strong>? This action cannot be
                    undone and all course content will be permanently removed.
                  </Text>
                </Stack>
                <Stack gap={3} w="full">
                  <Button
                    bg="#DC2626"
                    color="white"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="semibold"
                    w="full"
                    _hover={{ bg: "#B91C1C" }}
                    loading={actionLoading}
                    onClick={handleConfirmDelete}
                  >
                    Delete Course
                  </Button>
                  <Button
                    variant="outline"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="medium"
                    w="full"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Portal>
      )}

      {/* Unpublish confirmation modal */}
      {showUnpublishModal && (
        <Portal>
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.600"
            zIndex={200}
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={4}
            onClick={() => setShowUnpublishModal(false)}
          >
            <Box
              bg="white"
              rounded="2xl"
              p={8}
              w="full"
              maxW="440px"
              boxShadow="2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Stack gap={5} align="center" textAlign="center">
                <Box
                  w="56px"
                  h="56px"
                  rounded="full"
                  bg="#FEF3C7"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <AlertTriangle size={26} color="#F59E0B" />
                </Box>

                <Stack gap={2}>
                  <Heading as="h3" size="md" color="gray.900">
                    Unpublish Course?
                  </Heading>
                  <Text fontSize="sm" color="gray.500" lineHeight="1.6">
                    Are you sure you want to unpublish this course? It will be
                    removed from live courses and won&apos;t be visible to
                    students, but you can restore it anytime.
                  </Text>
                </Stack>

                <Stack gap={3} w="full">
                  <Button
                    bg="#2E2F6F"
                    color="white"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="semibold"
                    w="full"
                    _hover={{ bg: "#262760" }}
                    loading={actionLoading}
                    onClick={handleConfirmUnpublish}
                  >
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    rounded="full"
                    h="48px"
                    fontSize="sm"
                    fontWeight="medium"
                    w="full"
                    onClick={() => setShowUnpublishModal(false)}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Portal>
      )}
    </Box>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense>
      <CourseDetailContent />
    </Suspense>
  );
}
