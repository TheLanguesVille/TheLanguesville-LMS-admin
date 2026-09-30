"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Heading,
  Portal,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  type LucideIcon,
  Mail,
  Medal,
  MessagesSquare,
  Star,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NumberCard, PageTopBar } from "@/components/assignment/shared";
import { Avatar } from "@/components/shared/avatar";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  type ActivityItem,
  type ActivityType,
  type GradeItem,
  type StudentDetail,
  getStudentDetail,
  listStudentActivity,
  listStudentGrades,
  relativeTime,
} from "@/lib/api/students";
import { messagePaths, studentPaths } from "@/lib/routes";

const LEVEL_BADGE = { bg: "#EEF0FB", color: "#4338CA" };
const GRADES_PAGE_SIZE = 10;
const ACTIVITY_PAGE_SIZE = 5;

function activityIcon(type: ActivityType): LucideIcon {
  switch (type) {
    case "lesson_completed":
      return Medal;
    case "milestone":
      return Trophy;
    case "joined_course":
      return CalendarDays;
    case "assignment_submitted":
      return Upload;
    case "grade_received":
      return Star;
    case "message_received":
      return Mail;
    default:
      return Bell;
  }
}

function GradeRow({ grade }: { grade: GradeItem }) {
  return (
    <Flex justify="space-between" align="center" py={4} borderBottomWidth="1px" borderColor="gray.100" _last={{ borderBottomWidth: 0, pb: 0 }}>
      <Stack gap={0}>
        <Text fontSize="sm" fontWeight="medium" color="gray.900">
          {grade.title}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {grade.course ?? "—"}
        </Text>
      </Stack>
      <Text fontSize="sm" color="gray.900">
        <Text as="span" fontWeight="bold">
          {grade.score ?? "—"}
        </Text>
        <Text as="span" color="gray.400">
          /{grade.totalPoints}
        </Text>
      </Text>
    </Flex>
  );
}

function AllGradesModal({
  studentId,
  onClose,
}: {
  studentId: string;
  onClose: () => void;
}) {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const result = await listStudentGrades(studentId, {
        page,
        limit: GRADES_PAGE_SIZE,
      });
      if (!active) return;
      if (result.success) {
        setGrades(result.data.grades);
        setTotalPages(result.data.totalPages || 1);
      } else {
        toast.error(getApiErrorMessage(result, "Couldn't load grades"));
      }
      setLoading(false);
    };
    const id = setTimeout(run, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [studentId, page]);

  return (
    <Portal>
      <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={200} display="flex" alignItems="center" justifyContent="center" px={4} onClick={onClose}>
        <Box bg="white" rounded="2xl" w="full" maxW="560px" boxShadow="2xl" onClick={(e) => e.stopPropagation()} overflow="hidden">
          <Flex justify="space-between" align="center" px={7} pt={6} pb={4}>
            <Heading as="h3" size="md" color="gray.900">
              All Grades
            </Heading>
            <Flex as="button" onClick={onClose} w="32px" h="32px" rounded="full" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color="gray.500" cursor="pointer" _hover={{ bg: "gray.50" }}>
              <X size={16} />
            </Flex>
          </Flex>

          <Box px={7} pb={2} maxH="420px" overflowY="auto">
            {loading ? (
              <Stack gap={4} py={2}>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} h="40px" rounded="md" />
                ))}
              </Stack>
            ) : grades.length === 0 ? (
              <Flex direction="column" align="center" justify="center" py="50px" gap={2} color="gray.400">
                <FileText size={28} />
                <Text fontSize="sm">No grades yet</Text>
              </Flex>
            ) : (
              <Stack gap={0}>
                {grades.map((g) => (
                  <GradeRow key={g.id} grade={g} />
                ))}
              </Stack>
            )}
          </Box>

          {totalPages > 1 ? (
            <Flex justify="space-between" align="center" px={7} py={4} borderTopWidth="1px" borderColor="gray.100">
              <Text fontSize="sm" color="gray.500">
                Page {page} of {totalPages}
              </Text>
              <HStack gap={2}>
                <Box as="button" onClick={page <= 1 ? undefined : () => setPage((p) => p - 1)} px={4} py={2} rounded="md" borderWidth="1px" borderColor="gray.200" bg="white" fontSize="sm" fontWeight="medium" color="gray.700" opacity={page <= 1 ? 0.5 : 1} cursor={page <= 1 ? "not-allowed" : "pointer"} _hover={page <= 1 ? undefined : { bg: "gray.50" }}>
                  Previous
                </Box>
                <Box as="button" onClick={page >= totalPages ? undefined : () => setPage((p) => p + 1)} px={4} py={2} rounded="md" borderWidth="1px" borderColor="gray.200" bg="white" fontSize="sm" fontWeight="medium" color="gray.700" opacity={page >= totalPages ? 0.5 : 1} cursor={page >= totalPages ? "not-allowed" : "pointer"} _hover={page >= totalPages ? undefined : { bg: "gray.50" }}>
                  Next
                </Box>
              </HStack>
            </Flex>
          ) : null}
        </Box>
      </Box>
    </Portal>
  );
}

function EmptyCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Flex direction="column" align="center" justify="center" py="50px" gap={2} color="gray.400">
      <FileText size={32} />
      <Text fontWeight="semibold" color="gray.900">
        {title}
      </Text>
      <Text fontSize="sm">{subtitle}</Text>
    </Flex>
  );
}

function DetailSkeleton() {
  return (
    <Box px={8} pt={2}>
      <Skeleton h="20px" w="180px" rounded="md" mb={6} />
      <HStack gap={4} mb={8}>
        <Skeleton w="56px" h="56px" rounded="full" />
        <Stack gap={2}>
          <Skeleton h="24px" w="220px" rounded="md" />
          <Skeleton h="14px" w="280px" rounded="md" />
        </Stack>
      </HStack>
      <HStack gap={5} mb={6} align="stretch">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} h="110px" flex="1" rounded="xl" />
        ))}
      </HStack>
      <Skeleton h="240px" rounded="xl" mb={6} />
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
        <Skeleton h="260px" rounded="xl" />
        <Skeleton h="260px" rounded="xl" />
      </Grid>
    </Box>
  );
}

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const studentId = params.get("studentId");

  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gradesOpen, setGradesOpen] = useState(false);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  // Horizontal scroller for the enrolled-courses carousel arrows.
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: -1 | 1) => {
    carouselRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!studentId) {
        setError("Student not found");
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await getStudentDetail(studentId);
      if (!active) return;
      if (result.success) {
        setDetail(result.data);
        setActivity(result.data.recentActivity);
        // The detail payload is page 1 of the activity feed (limit 5).
        setActivityPage(1);
        setActivityTotalPages(
          result.data.recentActivity.length < ACTIVITY_PAGE_SIZE ? 1 : 2,
        );
      } else {
        setError(getApiErrorMessage(result, "Couldn't load this student"));
      }
      setLoading(false);
    };
    const id = setTimeout(run, 0);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [studentId]);

  const loadMoreActivity = useCallback(async () => {
    if (!studentId) return;
    const next = activityPage + 1;
    setActivityLoading(true);
    const result = await listStudentActivity(studentId, {
      page: next,
      limit: ACTIVITY_PAGE_SIZE,
    });
    if (result.success) {
      setActivity((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...result.data.activities.filter((a) => !seen.has(a.id))];
      });
      setActivityPage(next);
      setActivityTotalPages(result.data.totalPages || next);
    } else {
      toast.error(getApiErrorMessage(result, "Couldn't load more activity"));
    }
    setActivityLoading(false);
  }, [studentId, activityPage]);

  if (loading) {
    return (
      <Box pb={10}>
        <PageTopBar />
        <DetailSkeleton />
      </Box>
    );
  }

  if (error || !detail) {
    return (
      <Box>
        <PageTopBar />
        <Flex direction="column" align="center" justify="center" py="160px" gap={3}>
          <Text fontWeight="semibold" color="gray.900">
            {error ?? "Student not found"}
          </Text>
          <Button variant="outline" rounded="full" onClick={() => router.push(studentPaths.list)}>
            Back to students
          </Button>
        </Flex>
      </Box>
    );
  }

  const { student, stats, enrolledCourses, recentGrades } = detail;
  const lastActive = relativeTime(student.lastActiveAt);

  return (
    <Box pb={10}>
      <PageTopBar />

      <Box px={8}>
        {/* Back + Message */}
        <Flex justify="space-between" align="flex-start">
          <Box>
            <Box as="button" onClick={() => router.push(studentPaths.list)} color="gray.500" mb={3} cursor="pointer" _hover={{ color: "gray.800" }}>
              <ArrowLeft size={20} />
            </Box>
            <HStack gap={2} mb={3} fontSize="sm">
              <Text color="gray.400">Students</Text>
              <Text color="gray.300">›</Text>
              <Text color="#2E2F6F" fontWeight="medium">
                {student.name}
              </Text>
            </HStack>
          </Box>
          <Button bg="#2E2F6F" color="white" rounded="full" h="40px" px={6} fontSize="sm" fontWeight="medium" _hover={{ bg: "#262760" }} onClick={() => router.push(messagePaths.withStudent(student.id))}>
            <MessagesSquare size={16} />
            Message
          </Button>
        </Flex>

        <HStack gap={4} mb={8}>
          <Avatar name={student.name} src={student.avatarUrl} initials={student.initials} size={56} />
          <Stack gap={1}>
            <Heading as="h1" size="xl" color="gray.900">
              {student.name}
            </Heading>
            <HStack gap={2} fontSize="sm" color="gray.500">
              <Text>{student.email}</Text>
              {lastActive ? (
                <>
                  <Text>•</Text>
                  <Text>Last active {lastActive}</Text>
                </>
              ) : null}
            </HStack>
          </Stack>
        </HStack>

        {/* Stat cards */}
        <HStack gap={5} align="stretch" mb={6}>
          <NumberCard label="Overall Progress" value={`${stats.overallProgress}%`} />
          <NumberCard label="Avg. Grade" value={stats.avgGrade ?? "—"} />
          <NumberCard label="Courses" value={stats.coursesCount} />
          <NumberCard label="Day Streak" value={stats.dayStreak} />
        </HStack>

        {/* Enrolled courses */}
        <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={6} mb={6}>
          <Flex justify="space-between" align="center" mb={5}>
            <Heading as="h2" size="md" color="gray.900">
              Enrolled Courses
            </Heading>
            {enrolledCourses.length > 0 ? (
              <HStack gap={3}>
                {([ChevronLeft, ChevronRight] as const).map((Icon, i) => (
                  <Flex key={i} as="button" onClick={() => scrollCarousel(i === 0 ? -1 : 1)} w="36px" h="36px" rounded="full" borderWidth="1px" borderColor="gray.200" align="center" justify="center" color="gray.500" cursor="pointer" _hover={{ bg: "gray.50" }}>
                    <Icon size={16} />
                  </Flex>
                ))}
              </HStack>
            ) : null}
          </Flex>
          {enrolledCourses.length === 0 ? (
            <EmptyCard title="No enrolled courses yet" subtitle="Courses this student enrolled in will appear here" />
          ) : (
            <Grid ref={carouselRef} gridAutoFlow="column" gridAutoColumns={{ base: "minmax(280px, 1fr)", md: "calc(50% - 10px)" }} gap={5} overflowX="auto" scrollSnapType="x mandatory" css={{ "&::-webkit-scrollbar": { display: "none" } }}>
              {enrolledCourses.map((c) => (
                <Box key={c.enrollmentId} borderWidth="1px" borderColor="gray.200" rounded="xl" p={5} scrollSnapAlign="start">
                  <Box display="inline-block" bg={LEVEL_BADGE.bg} color={LEVEL_BADGE.color} fontSize="xs" fontWeight="semibold" px={2.5} py={1} rounded="full" mb={3}>
                    {c.level}
                  </Box>
                  <Text fontWeight="semibold" color="gray.900" mb={1}>
                    {c.title}
                  </Text>
                  <Text fontSize="sm" color="gray.500" mb={3} lineClamp={1}>
                    {c.description}
                  </Text>
                  <Text fontSize="xs" color="gray.400" mb={3}>
                    {c.moduleCount} modules • {c.lessonCount} lessons • {c.duration}
                  </Text>
                  <HStack gap={3}>
                    <Box flex="1" bg="gray.100" rounded="full" h="6px">
                      <Box bg="#2E2F6F" rounded="full" h="6px" w={`${c.progress}%`} />
                    </Box>
                    <Text fontSize="xs" color="gray.500">
                      {c.progress}%
                    </Text>
                  </HStack>
                </Box>
              ))}
            </Grid>
          )}
        </Box>

        {/* Recent grades + activity */}
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={6}>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading as="h3" size="md" color="gray.900">
                Recent Grades
              </Heading>
              {recentGrades.length > 0 ? (
                <Box as="button" fontSize="sm" color="#4338CA" fontWeight="medium" cursor="pointer" onClick={() => setGradesOpen(true)}>
                  View All
                </Box>
              ) : null}
            </Flex>
            {recentGrades.length === 0 ? (
              <EmptyCard title="No grades yet" subtitle="Graded submissions will appear here" />
            ) : (
              <Stack gap={0}>
                {recentGrades.slice(0, 3).map((g) => (
                  <GradeRow key={g.id} grade={g} />
                ))}
              </Stack>
            )}
          </Box>

          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200" p={6}>
            <Heading as="h3" size="md" color="gray.900" mb={4}>
              Recent Activity
            </Heading>
            {activity.length === 0 ? (
              <EmptyCard title="No activities yet" subtitle="Recent activities as they come in will appear here" />
            ) : (
              <Stack gap={5}>
                {activity.map((a) => {
                  const Icon = activityIcon(a.type);
                  return (
                    <HStack key={a.id} gap={3} align="flex-start">
                      <Flex w="36px" h="36px" rounded="full" bg="gray.100" align="center" justify="center" color="#4338CA" flexShrink={0}>
                        <Icon size={16} />
                      </Flex>
                      <Stack gap={0}>
                        <Text fontSize="sm" color="gray.900">
                          {a.description}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          {relativeTime(a.occurredAt)}
                        </Text>
                      </Stack>
                    </HStack>
                  );
                })}
                {activityPage < activityTotalPages ? (
                  <Box as="button" alignSelf="flex-start" fontSize="sm" color="#4338CA" fontWeight="medium" cursor={activityLoading ? "default" : "pointer"} opacity={activityLoading ? 0.6 : 1} onClick={activityLoading ? undefined : loadMoreActivity}>
                    {activityLoading ? "Loading…" : "Load more"}
                  </Box>
                ) : null}
              </Stack>
            )}
          </Box>
        </Grid>
      </Box>

      
      {gradesOpen ? (
        <AllGradesModal studentId={student.id} onClose={() => setGradesOpen(false)} />
      ) : null}
    </Box>
  );
}
