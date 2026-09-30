"use client";

import {
  Box,
  Flex,
  HStack,
  Heading,
  Link,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  FileText,
  Plus,
  UserPlus,
} from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AddLessonModal } from "@/components/dashboard/add-lesson-modal";
import { CourseCard } from "@/components/dashboard/course-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { SearchInput } from "@/components/dashboard/search-input";
import { SegmentedTabs } from "@/components/dashboard/segmented-tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { StudentsChart } from "@/components/dashboard/students-chart";
import { InviteAdminModal } from "@/components/settings/invite-admin-modal";
import {
  type DashboardData,
  type Period,
  formatStatValue,
  getDashboard,
} from "@/lib/api/analytics";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAdmin } from "@/lib/hooks/use-admin";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { assignmentPaths, coursePaths } from "@/lib/routes";

const RANGE_TABS: { value: Period; label: string }[] = [
  { value: "12months", label: "12 months" },
  { value: "30days", label: "30 days" },
  { value: "7days", label: "7 days" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDateLine() {
  const now = new Date();
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** The API's lowercase `status` → the capitalised variant CourseCard takes. */
function toCardStatus(status: string): "Published" | "Draft" {
  return status.toLowerCase() === "published" ? "Published" : "Draft";
}

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("12months");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const { admin, loading: adminLoading } = useAdmin();
  const { has, loading: permissionsLoading } = usePermissions();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName = admin?.firstName ?? "";
  const canViewAnalytics = has("analytics.view");
  const canEditCourses = has("courses.edit");
  // Same permission the backend checks on POST /settings/admins/invite.
  const canInvite = has("settings.manage_admins");

  const fetchData = useCallback(async () => {
    if (permissionsLoading || !canViewAnalytics) return;
    setLoading(true);
    setError(null);
    const result = await getDashboard(period);
    if (result.success) {
      setData(result.data);
    } else {
      setData(null);
      setError(getApiErrorMessage(result, "Couldn't load dashboard data"));
    }
    setLoading(false);
  }, [period, permissionsLoading, canViewAnalytics]);

  useEffect(() => {
    const id = setTimeout(fetchData, 0);
    return () => clearTimeout(id);
  }, [fetchData]);

  // The metrics below all come from the gated analytics endpoint, so without
  // the permission there is nothing to show but the greeting and shortcuts.
  const metricsBlocked = !permissionsLoading && !canViewAnalytics;
  const showSkeletons = permissionsLoading || loading;

  // Each shortcut only renders when the role can actually use it.
  const quickActionItems = [
    canEditCourses && (
      <QuickActionCard
        key="create-course"
        icon={Plus}
        title="Create Course"
        description="Start curriculum builder"
        onClick={() => router.push(coursePaths.new)}
      />
    ),
    canEditCourses && (
      <QuickActionCard
        key="add-lesson"
        icon={BookOpen}
        title="Add Lesson"
        description="Build content blocks"
        onClick={() => setAddLessonOpen(true)}
      />
    ),
    <QuickActionCard
      key="assign-content"
      icon={FileText}
      title="Assign Content"
      description="Set lessons & deadlines"
      iconColor="#F97461"
      iconBg="#FFE4DE"
      onClick={() => router.push(assignmentPaths.new)}
    />,
    canInvite && (
      <QuickActionCard
        key="invite-admin"
        icon={UserPlus}
        title="Invite Admin"
        description="Email a new admin invite"
        onClick={() => setInviteOpen(true)}
      />
    ),
  ].filter(Boolean);

  const quickActions = (
    <Box bg="white" rounded="lg" borderWidth="1px" borderColor="gray.200" p={5}>
      <Heading as="h3" size="md" color="gray.900" mb={4}>
        Quick Actions
      </Heading>
      {permissionsLoading ? (
        <SimpleGrid columns={2} gap={3}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="104px" rounded="lg" />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          {quickActionItems}
        </SimpleGrid>
      )}
    </Box>
  );

  const studentsChange = data?.studentsChart.changePercent ?? null;
  const studentsUp = studentsChange !== null && studentsChange >= 0;

  return (
    <Box>
      <DashboardHeader
        title="Dashboard"
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
        <Stack gap={6}>
          {/* Greeting */}
          <Stack gap={1}>
            {adminLoading ? (
              <>
                <Skeleton height="36px" width="320px" rounded="md" />
                <Skeleton height="18px" width="240px" rounded="md" mt={1} />
              </>
            ) : (
              <>
                <Heading as="h2" size="xl" color="gray.900">
                  {getGreeting()}
                  {firstName ? `, ${firstName}` : ""}.
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  {formatDateLine()}
                </Text>
              </>
            )}
          </Stack>

          {/* Range tabs + search */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <SegmentedTabs
              tabs={RANGE_TABS}
              value={period}
              onChange={(value) => setPeriod(value as Period)}
            />
            <SearchInput placeholder="Search courses, students" />
          </Flex>

          {metricsBlocked ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py="60px"
              gap={2}
              bg="white"
              rounded="lg"
              borderWidth="1px"
              borderColor="gray.200"
              color="gray.400"
            >
              <FileText size={32} />
              <Text fontWeight="semibold" color="gray.900">
                Metrics aren&apos;t available for your role
              </Text>
              <Text fontSize="sm">
                Ask an admin for the &ldquo;View analytics&rdquo; permission.
              </Text>
            </Flex>
          ) : error ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py="60px"
              gap={2}
              bg="white"
              rounded="lg"
              borderWidth="1px"
              borderColor="gray.200"
              color="gray.400"
            >
              <FileText size={32} />
              <Text fontWeight="semibold" color="gray.900">
                Couldn&apos;t load dashboard data
              </Text>
              <Text fontSize="sm" maxW="420px" textAlign="center">
                {error}
              </Text>
              <Box
                as="button"
                onClick={fetchData}
                mt={2}
                px={4}
                py={2}
                rounded="md"
                borderWidth="1px"
                borderColor="gray.200"
                bg="white"
                fontSize="sm"
                fontWeight="medium"
                color="gray.700"
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
              >
                Try again
              </Box>
            </Flex>
          ) : (
            <>
              {/* Stat cards */}
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
                {showSkeletons || !data
                  ? [...Array(4)].map((_, i) => (
                      <Skeleton key={i} height="96px" rounded="lg" />
                    ))
                  : data.stats.map((stat) => (
                      <StatCard
                        key={stat.key}
                        label={stat.label}
                        value={formatStatValue(stat)}
                        changePercent={stat.changePercent}
                        unavailableReason={stat.unavailableReason}
                      />
                    ))}
              </SimpleGrid>

              {/* Active Courses + Quick Actions */}
              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
                <Box
                  bg="white"
                  rounded="lg"
                  borderWidth="1px"
                  borderColor="gray.200"
                  p={5}
                >
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading as="h3" size="md" color="gray.900">
                      Active Courses
                    </Heading>
                    <Link
                      as={NextLink}
                      href="/courses"
                      fontSize="sm"
                      color="#F97461"
                      fontWeight="semibold"
                      _hover={{ textDecoration: "underline" }}
                    >
                      View All
                    </Link>
                  </Flex>

                  {showSkeletons || !data ? (
                    <Flex gap={3} wrap="wrap">
                      <Skeleton height="140px" rounded="lg" flex="1" />
                      <Skeleton height="140px" rounded="lg" flex="1" />
                    </Flex>
                  ) : data.activeCourses.length === 0 ? (
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      py="48px"
                      gap={2}
                      color="gray.400"
                    >
                      <BookOpen size={28} />
                      <Text fontSize="sm" fontWeight="medium" color="gray.600">
                        No active courses
                      </Text>
                      <Text fontSize="sm">
                        Published courses will appear here
                      </Text>
                    </Flex>
                  ) : (
                    <Flex gap={3} wrap="wrap">
                      {/* Two per row is what the card sizing is tuned for. */}
                      {data.activeCourses.slice(0, 2).map((course) => (
                        <CourseCard
                          key={course.id}
                          level={course.level}
                          status={toCardStatus(course.status)}
                          title={course.title}
                          modules={course.modules}
                          lessons={course.lessons}
                          hours={course.hours}
                          progressPercent={course.progressPercent}
                        />
                      ))}
                    </Flex>
                  )}
                </Box>

                {quickActions}
              </SimpleGrid>

              {/* Students chart */}
              <Box
                bg="white"
                rounded="lg"
                borderWidth="1px"
                borderColor="gray.200"
                p={5}
              >
                <Stack gap={2} mb={4}>
                  <Heading as="h3" size="md" color="gray.900">
                    Total Students
                  </Heading>
                  {showSkeletons || !data ? (
                    <Skeleton height="36px" width="180px" rounded="md" />
                  ) : (
                    <HStack gap={3}>
                      <Heading
                        as="p"
                        size="2xl"
                        color="gray.900"
                        fontWeight="semibold"
                      >
                        {data.studentsChart.total.toLocaleString()}
                      </Heading>
                      {studentsChange !== null ? (
                        <HStack
                          gap={1}
                          color={studentsUp ? "#16A34A" : "#EF4444"}
                        >
                          {studentsUp ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                          <Text fontSize="sm" fontWeight="medium">
                            {Math.abs(studentsChange)}%
                          </Text>
                        </HStack>
                      ) : null}
                    </HStack>
                  )}
                </Stack>

                {showSkeletons || !data ? (
                  <Skeleton height="280px" rounded="lg" />
                ) : (
                  <StudentsChart data={data.studentsChart.series} />
                )}
              </Box>
            </>
          )}

          {/* Without metrics the shortcuts still work — show them alone. */}
          {metricsBlocked || error ? quickActions : null}
        </Stack>
      </Box>

      {inviteOpen ? (
        <InviteAdminModal
          onClose={() => setInviteOpen(false)}
          onSent={() => {}}
        />
      ) : null}
      {addLessonOpen ? (
        <AddLessonModal onClose={() => setAddLessonOpen(false)} />
      ) : null}
    </Box>
  );
}
