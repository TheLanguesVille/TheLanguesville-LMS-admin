"use client";

import {
  Box,
  Flex,
  Grid,
  HStack,
  Heading,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowDown, ArrowUp, FileText, Info, Lock, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  type AnalyticsStat,
  type CoursePerformanceData,
  type OverviewData,
  type Period,
  formatStatValue,
  getCoursePerformance,
  getOverview,
} from "@/lib/api/analytics";
import { roleLabel } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAdmin } from "@/lib/hooks/use-admin";
import { usePermissions } from "@/lib/hooks/use-permissions";

const PERIODS: { value: Period; label: string }[] = [
  { value: "12months", label: "12 months" },
  { value: "30days", label: "30 days" },
  { value: "7days", label: "7 days" },
];

const PERF_COLS = "1.8fr 0.7fr 0.9fr 1.1fr 0.9fr 0.8fr";
const PAGE_SIZE = 5;

function StatCard({ stat }: { stat: AnalyticsStat }) {
  const change = stat.changePercent;
  const isUp = change !== null && change >= 0;
  const color = isUp ? "#16A34A" : "#EF4444";
  const Icon = isUp ? ArrowUp : ArrowDown;

  return (
    <Box
      bg="white"
      rounded="xl"
      borderWidth="1px"
      borderColor="gray.200"
      p={5}
      flex="1"
      minW="0"
    >
      <Stack gap={3}>
        <Text fontSize="sm" color="gray.700">
          {stat.label}
        </Text>
        <Heading as="p" size="2xl" color="gray.900" fontWeight="bold">
          {formatStatValue(stat)}
        </Heading>

        {change !== null ? (
          <HStack gap={1}>
            <Icon size={14} color={color} />
            <Text fontSize="xs" color={color} fontWeight="medium">
              {Math.abs(change)}%
            </Text>
          </HStack>
        ) : stat.unavailableReason ? (
          <HStack gap={1.5} align="flex-start" title={stat.unavailableReason}>
            <Box color="gray.400" mt="1px" flexShrink={0}>
              <Info size={13} />
            </Box>
            <Text fontSize="xs" color="gray.400" lineClamp={2}>
              Not measured yet
            </Text>
          </HStack>
        ) : (
          // Hold the row height so the 4-up grid stays aligned.
          <Box h="18px" />
        )}
      </Stack>
    </Box>
  );
}

function EmptyBlock({
  title,
  subtitle,
  py = "60px",
}: {
  title: string;
  subtitle: string;
  py?: string;
}) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      py={py}
      gap={2}
      color="gray.400"
    >
      <FileText size={32} />
      <Text fontWeight="semibold" color="gray.900">
        {title}
      </Text>
      <Text fontSize="sm" textAlign="center" maxW="420px">
        {subtitle}
      </Text>
    </Flex>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("12months");
  const [page, setPage] = useState(1);
  const { admin, loading: adminLoading } = useAdmin();
  const { has, loading: permissionsLoading } = usePermissions();

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [table, setTable] = useState<CoursePerformanceData | null>(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  const canView = has("analytics.view");

  const fetchOverview = useCallback(async () => {
    if (permissionsLoading || !canView) return;
    setOverviewLoading(true);
    setOverviewError(null);
    const result = await getOverview(period);
    if (result.success) {
      setOverview(result.data);
    } else {
      setOverview(null);
      setOverviewError(getApiErrorMessage(result, "Couldn't load analytics"));
    }
    setOverviewLoading(false);
  }, [period, permissionsLoading, canView]);

  const fetchTable = useCallback(async () => {
    if (permissionsLoading || !canView) return;
    setTableLoading(true);
    setTableError(null);
    const result = await getCoursePerformance({
      period,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setTable(result.data);
    } else {
      setTable(null);
      setTableError(
        getApiErrorMessage(result, "Couldn't load course performance"),
      );
    }
    setTableLoading(false);
  }, [period, page, permissionsLoading, canView]);

  useEffect(() => {
    const id = setTimeout(fetchOverview, 0);
    return () => clearTimeout(id);
  }, [fetchOverview]);

  useEffect(() => {
    const id = setTimeout(fetchTable, 0);
    return () => clearTimeout(id);
  }, [fetchTable]);

  const userChip = admin
    ? {
        name: `${admin.firstName} ${admin.lastName}`.trim(),
        role: roleLabel(admin.role),
      }
    : undefined;

  const totalPages = table?.totalPages || 1;
  const showOverviewSkeleton = permissionsLoading || overviewLoading;
  const showTableSkeleton = permissionsLoading || tableLoading;

  // Without the permission the endpoints would 403, so don't render a screen
  // full of empty charts that read as real zeroes.
  if (!permissionsLoading && !canView) {
    return (
      <Box>
        <DashboardHeader
          title="Analytics"
          loading={adminLoading}
          user={userChip}
        />
        <Flex
          direction="column"
          align="center"
          justify="center"
          py="180px"
          gap={3}
          color="gray.400"
        >
          <Lock size={40} />
          <Stack gap={1} textAlign="center">
            <Text fontWeight="semibold" color="gray.900">
              You don&apos;t have access to Analytics
            </Text>
            <Text fontSize="sm" maxW="360px">
              This screen needs the &ldquo;View analytics&rdquo; permission. Ask
              an admin to grant it from Settings → Roles &amp; Permissions.
            </Text>
          </Stack>
        </Flex>
      </Box>
    );
  }

  return (
    <Box>
      <DashboardHeader
        title="Analytics"
        loading={adminLoading}
        user={userChip}
      />

      <Box px={8} py={6}>
        <Stack gap={1} mb={6}>
          <Heading as="h2" size="xl" color="gray.900">
            Performance Overview
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Track completion, engagement, and identify drop-off points in your
            courses.
          </Text>
        </Stack>

        {/* Period segmented control */}
        <HStack
          gap={0}
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          rounded="lg"
          p={1}
          w="fit-content"
          mb={6}
        >
          {PERIODS.map((p) => {
            const active = period === p.value;
            return (
              <Box
                key={p.value}
                as="button"
                onClick={() => {
                  setPeriod(p.value);
                  setPage(1);
                }}
                px={4}
                py={2}
                rounded="md"
                fontSize="sm"
                fontWeight="medium"
                bg={active ? "gray.100" : "transparent"}
                color={active ? "gray.900" : "gray.500"}
                cursor="pointer"
                _hover={active ? undefined : { color: "gray.700" }}
              >
                {p.label}
              </Box>
            );
          })}
        </HStack>

        {overviewError ? (
          <Box
            bg="white"
            rounded="xl"
            borderWidth="1px"
            borderColor="gray.200"
            mb={6}
          >
            <EmptyBlock
              title="Couldn't load analytics"
              subtitle={overviewError}
              py="70px"
            />
          </Box>
        ) : (
          <>
            {/* Stat cards */}
            <HStack gap={5} align="stretch" mb={6}>
              {showOverviewSkeleton || !overview
                ? [...Array(4)].map((_, i) => (
                    <Skeleton key={i} height="132px" rounded="xl" flex="1" />
                  ))
                : overview.stats.map((stat) => (
                    <StatCard key={stat.key} stat={stat} />
                  ))}
            </HStack>

            {/* Engagement + Drop-offs */}
            <Grid
              templateColumns={{ base: "1fr", lg: "1.6fr 1fr" }}
              gap={6}
              mb={8}
            >
              <Box
                bg="white"
                rounded="xl"
                borderWidth="1px"
                borderColor="gray.200"
                p={6}
              >
                <Stack gap={0} mb={2}>
                  <Text fontWeight="semibold" color="gray.900">
                    Course Engagement
                  </Text>
                  {/* Activity events, not sessions — the backend has no
                      session tracking. */}
                  <Text fontSize="sm" color="gray.500">
                    Recorded learning activity
                  </Text>
                </Stack>

                {showOverviewSkeleton || !overview ? (
                  <>
                    <Skeleton height="32px" width="120px" rounded="md" mb={2} />
                    <Skeleton height="240px" rounded="lg" />
                  </>
                ) : (
                  <>
                    <Heading as="p" size="xl" color="gray.900" mb={2}>
                      {overview.engagement.total.toLocaleString()}
                    </Heading>
                    <Box w="full" h="240px">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={overview.engagement.series}
                          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="engGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#F97461"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="100%"
                                stopColor="#F97461"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#F3F4F6" vertical={false} />
                          <XAxis
                            dataKey="x"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#9CA3AF", fontSize: 12 }}
                            interval={
                              overview.engagement.series.length > 14 ? 1 : 0
                            }
                          />
                          <Tooltip
                            cursor={{
                              stroke: "#F97461",
                              strokeWidth: 1,
                              strokeDasharray: "4",
                            }}
                            contentStyle={{
                              borderRadius: 8,
                              border: "1px solid #E5E7EB",
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name="Activity"
                            stroke="#F97461"
                            strokeWidth={2}
                            fill="url(#engGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </>
                )}
              </Box>

              <Box
                bg="white"
                rounded="xl"
                borderWidth="1px"
                borderColor="gray.200"
                p={6}
              >
                <Stack gap={0} mb={5}>
                  <Text fontWeight="semibold" color="gray.900">
                    Drop-off Points
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Lesson where students disengage
                  </Text>
                </Stack>

                {showOverviewSkeleton || !overview ? (
                  <Stack gap={5}>
                    {[...Array(3)].map((_, i) => (
                      <Stack key={i} gap={2}>
                        <Skeleton height="14px" width="60%" rounded="md" />
                        <Skeleton height="12px" width="40%" rounded="md" />
                        <Skeleton height="6px" rounded="full" />
                      </Stack>
                    ))}
                  </Stack>
                ) : overview.dropOffPoints.length > 0 ? (
                  <Stack gap={5}>
                    {overview.dropOffPoints.map((d) => (
                      <Stack key={d.id} gap={2}>
                        <Stack gap={0}>
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            color="gray.900"
                          >
                            {d.lesson}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {d.course}
                          </Text>
                        </Stack>
                        <HStack gap={3}>
                          <Box flex="1" bg="gray.100" rounded="full" h="6px">
                            <Box
                              bg="#2E2F6F"
                              rounded="full"
                              h="6px"
                              w={`${d.percent}%`}
                            />
                          </Box>
                          <Text
                            fontSize="xs"
                            color="gray.500"
                            w="32px"
                            textAlign="right"
                          >
                            {d.percent}%
                          </Text>
                        </HStack>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <EmptyBlock
                    title="No drop-offs yet"
                    subtitle="Drop-off lessons will appear here"
                  />
                )}
              </Box>
            </Grid>
          </>
        )}

        {/* Course performance */}
        <Heading as="h3" size="md" color="gray.900" mb={4}>
          Course Performance
        </Heading>

        {tableError ? (
          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
            <EmptyBlock
              title="Couldn't load course performance"
              subtitle={tableError}
              py="70px"
            />
          </Box>
        ) : showTableSkeleton || !table ? (
          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
            <Grid
              templateColumns={PERF_COLS}
              gap={4}
              px={5}
              py={3.5}
              bg="gray.50"
              roundedTop="xl"
            >
              {[
                "Course",
                "Level",
                "Students",
                "Avg Completion",
                "Engagement",
                "Rating",
              ].map((h) => (
                <Text key={h} fontSize="sm" color="gray.500">
                  {h}
                </Text>
              ))}
            </Grid>
            {[...Array(PAGE_SIZE)].map((_, i) => (
              <Grid
                key={i}
                templateColumns={PERF_COLS}
                gap={4}
                px={5}
                py={4}
                alignItems="center"
                borderTopWidth="1px"
                borderColor="gray.100"
              >
                {[...Array(6)].map((_, c) => (
                  <Skeleton key={c} height="14px" width="70%" rounded="md" />
                ))}
              </Grid>
            ))}
          </Box>
        ) : table.courses.length > 0 ? (
          <Box bg="white" rounded="xl" borderWidth="1px" borderColor="gray.200">
            <Grid
              templateColumns={PERF_COLS}
              gap={4}
              px={5}
              py={3.5}
              bg="gray.50"
              roundedTop="xl"
            >
              {[
                "Course",
                "Level",
                "Students",
                "Avg Completion",
                "Engagement",
                "Rating",
              ].map((h) => (
                <Text key={h} fontSize="sm" color="gray.500">
                  {h}
                </Text>
              ))}
            </Grid>

            {table.courses.map((c) => (
              <Grid
                key={c.id}
                templateColumns={PERF_COLS}
                gap={4}
                px={5}
                py={4}
                alignItems="center"
                borderTopWidth="1px"
                borderColor="gray.100"
              >
                <Text fontSize="sm" color="gray.900" fontWeight="medium">
                  {c.course}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {c.level}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {c.students}
                </Text>
                <Stack gap={1.5}>
                  <Text fontSize="sm" color="gray.700">
                    {c.completion}%
                  </Text>
                  <Box bg="gray.100" rounded="full" h="6px" w="80%">
                    <Box
                      bg="#2E2F6F"
                      rounded="full"
                      h="6px"
                      w={`${c.completion}%`}
                    />
                  </Box>
                </Stack>
                <Text fontSize="sm" color="gray.700">
                  {c.engagement}%
                </Text>
                {/* null rating = no reviews yet, not a zero-star course. */}
                {c.rating === null ? (
                  <Text fontSize="sm" color="gray.400">
                    —
                  </Text>
                ) : (
                  <HStack gap={1}>
                    <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    <Text fontSize="sm" color="gray.700">
                      {c.rating.toFixed(1)}
                    </Text>
                  </HStack>
                )}
              </Grid>
            ))}

            <Flex
              justify="space-between"
              align="center"
              px={5}
              py={4}
              borderTopWidth="1px"
              borderColor="gray.100"
            >
              <Text fontSize="sm" color="gray.500">
                Page {table.page} of {totalPages}
              </Text>
              <HStack gap={2}>
                <Box
                  as="button"
                  onClick={
                    page <= 1
                      ? undefined
                      : () => setPage((p) => Math.max(1, p - 1))
                  }
                  px={4}
                  py={2}
                  rounded="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                  bg="white"
                  fontSize="sm"
                  fontWeight="medium"
                  color="gray.700"
                  opacity={page <= 1 ? 0.5 : 1}
                  cursor={page <= 1 ? "not-allowed" : "pointer"}
                  _hover={page <= 1 ? undefined : { bg: "gray.50" }}
                >
                  Previous
                </Box>
                <Box
                  as="button"
                  onClick={
                    page >= totalPages
                      ? undefined
                      : () => setPage((p) => Math.min(totalPages, p + 1))
                  }
                  px={4}
                  py={2}
                  rounded="md"
                  borderWidth="1px"
                  borderColor="gray.200"
                  bg="white"
                  fontSize="sm"
                  fontWeight="medium"
                  color="gray.700"
                  opacity={page >= totalPages ? 0.5 : 1}
                  cursor={page >= totalPages ? "not-allowed" : "pointer"}
                  _hover={page >= totalPages ? undefined : { bg: "gray.50" }}
                >
                  Next
                </Box>
              </HStack>
            </Flex>
          </Box>
        ) : (
          <EmptyBlock
            title="No data yet"
            subtitle="Performance per course will appear here"
            py="80px"
          />
        )}
      </Box>
    </Box>
  );
}
