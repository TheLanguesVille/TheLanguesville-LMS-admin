"use client";

import { roleLabel } from "@/lib/api/auth";
import React from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Portal,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { AlertTriangle, Trash2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SearchInput } from "@/components/dashboard/search-input";
import { AppButton } from "@/components/ui/app-button";
import { useAdmin } from "@/lib/hooks/use-admin";
import { coursePaths } from "@/lib/routes";
import {
  type CourseSummary,
  deleteCourse,
  listAllCourses,
} from "@/lib/api/courses";
import { Avatar } from "@/components/shared/avatar";

type TabValue = "all" | "published" | "draft";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "#3B82F6",
  A2: "#6366F1",
  B1: "#8B5CF6",
  B2: "#EC4899",
  C1: "#F97316",
  C2: "#EF4444",
};

function CourseRow({
  course,
  onDelete,
  onClick,
  showOwner,
}: {
  course: CourseSummary;
  onDelete: (id: string) => void;
  onClick: () => void;
  /** Admins see every course, so label whose course it is. */
  showOwner: boolean;
}) {
  const owner = course.instructorId
    ? `${course.instructorId.firstName ?? ""} ${course.instructorId.lastName ?? ""}`.trim() ||
      course.instructorId.email
    : null;
  const moduleCount =
    course.moduleCount ?? (course.modules ? course.modules.length : 0);
  const totalLessons =
    course.lessonCount ??
    (course.modules
      ? course.modules.reduce((s, m) => s + (m.lessons?.length ?? 0), 0)
      : 0);
  const completion = Math.round(course.completionRate ?? 0);
  const levelColor = LEVEL_COLORS[course.level] ?? "#6366F1";

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      rounded="xl"
      p={5}
      cursor="pointer"
      transition="box-shadow 0.15s"
      _hover={{ boxShadow: "sm" }}
      onClick={onClick}
    >
      <Flex justify="space-between" align="flex-start" mb={2}>
        <HStack gap={2}>
          <Box
            fontSize="xs"
            fontWeight="bold"
            color={levelColor}
            bg={`${levelColor}18`}
            px={2}
            py={0.5}
            rounded="md"
          >
            {course.level}
          </Box>
        </HStack>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={course.status === "published" ? "#16A34A" : "#F59E0B"}
        >
          {course.status === "published" ? "Published" : "Draft"}
        </Text>
      </Flex>

      <Text fontWeight="semibold" fontSize="md" color="gray.900" mb={1}>
        {course.title}
      </Text>
      <Text fontSize="sm" color="gray.500" mb={3} lineClamp={2}>
        {course.description}
      </Text>

      <Flex justify="space-between" align="center" mb={2}>
        <HStack gap={1} fontSize="xs" color="gray.500" flexWrap="wrap">
          <Text color="#2E2F6F" fontWeight="medium">
            {moduleCount} module{moduleCount !== 1 ? "s" : ""}
          </Text>
          <Text>•</Text>
          <Text>
            {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
          </Text>
          <Text>•</Text>
          <Text>{course.duration}</Text>
          <Text>•</Text>
          <Text>
            {course.enrolledCount} student
            {course.enrolledCount !== 1 ? "s" : ""}
          </Text>
        </HStack>
        <Text fontWeight="bold" fontSize="sm" color="gray.900">
          {course.price === 0 ? "Free" : `$${course.price}`}
        </Text>
      </Flex>

      {/* Progress bar */}
      <Box bg="gray.100" rounded="full" h="6px" mb={3}>
        <Box
          bg="#2E2F6F"
          rounded="full"
          h="6px"
          w={`${completion}%`}
          transition="width 0.4s"
        />
      </Box>

      <Flex justify="space-between" align="center">
        <HStack gap={2} minW={0}>
          {showOwner && owner ? (
            <HStack gap={1.5} minW={0} title={`Created by ${owner}`}>
              <Avatar name={owner} size={20} />
              <Text fontSize="xs" color="gray.600" fontWeight="medium" lineClamp={1}>
                {owner}
              </Text>
              <Text fontSize="xs" color="gray.300">
                •
              </Text>
            </HStack>
          ) : null}
          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
            Updated {timeAgo(course.updatedAt)}
          </Text>
        </HStack>
        <Box
          as="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onDelete(course._id);
          }}
          color="red.400"
          cursor="pointer"
          _hover={{ color: "red.600" }}
          transition="color 0.15s"
          aria-label="Delete course"
        >
          <Trash2 size={16} />
        </Box>
      </Flex>
    </Box>
  );
}

function CourseRowSkeleton() {
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" rounded="xl" p={5}>
      <Flex justify="space-between" mb={3}>
        <Skeleton height="20px" width="36px" rounded="md" />
        <Skeleton height="16px" width="60px" rounded="md" />
      </Flex>
      <Skeleton height="20px" width="60%" rounded="md" mb={2} />
      <Skeleton height="14px" width="90%" rounded="md" mb={1} />
      <Skeleton height="14px" width="75%" rounded="md" mb={4} />
      <Skeleton height="6px" rounded="full" mb={3} />
      <Flex justify="space-between">
        <Skeleton height="12px" width="100px" rounded="md" />
        <Skeleton height="16px" width="16px" rounded="md" />
      </Flex>
    </Box>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const { admin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<CourseSummary | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // Load every visible course once per search (instructors get their own,
  // admins get all of them) and split into tabs client-side, so the tab
  // counts are real totals rather than counts of the current page.
  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    const result = await listAllCourses(search ? { search } : {});
    if (result.success) setCourses(result.data);
    else toast.error(result.message || "Couldn't load courses");
    setCoursesLoading(false);
  }, [search]);

  useEffect(() => {
    const id = setTimeout(fetchCourses, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [fetchCourses, search]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteCourse(pendingDelete._id);
    if (result.success) {
      toast.success("Course deleted");
      setCourses((prev) => prev.filter((c) => c._id !== pendingDelete._id));
      setPendingDelete(null);
    } else {
      toast.error(result.message || "Failed to delete course");
    }
    setDeleting(false);
  };

  const visibleCourses =
    activeTab === "all"
      ? courses
      : courses.filter((c) => c.status === activeTab);
  const seesEverything = admin?.role === "admin" || admin?.role === "superadmin";

  const allCount = courses.length;
  const publishedCount = courses.filter((c) => c.status === "published").length;
  const draftCount = courses.filter((c) => c.status === "draft").length;

  const TABS = [
    { value: "all" as TabValue, label: "All", count: allCount },
    {
      value: "published" as TabValue,
      label: "Published",
      count: publishedCount,
    },
    { value: "draft" as TabValue, label: "Draft", count: draftCount },
  ];

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
        <Stack gap={6}>
          {/* Underline tabs */}
          <Box borderBottomWidth="1px" borderColor="gray.200">
            <HStack gap={6}>
              {TABS.map((tab) => {
                const active = tab.value === activeTab;
                return (
                  <Box
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    pb={3}
                    borderBottomWidth="2px"
                    borderColor={active ? "#2E2F6F" : "transparent"}
                    cursor="pointer"
                  >
                    <HStack gap={2}>
                      <Text
                        fontSize="sm"
                        fontWeight={active ? "semibold" : "medium"}
                        color={active ? "#2E2F6F" : "gray.500"}
                      >
                        {tab.label}
                      </Text>
                      <Box
                        bg={active ? "#E8E9F5" : "gray.100"}
                        color={active ? "#2E2F6F" : "gray.500"}
                        fontSize="xs"
                        fontWeight="semibold"
                        rounded="full"
                        px={2}
                        py={0.5}
                        minW="20px"
                        textAlign="center"
                      >
                        {tab.count}
                      </Box>
                    </HStack>
                  </Box>
                );
              })}
            </HStack>
          </Box>

          {/* Search + New course */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <SearchInput
              placeholder="Search a course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <AppButton
              w="auto"
              px={5}
              onClick={() => router.push("/courses/new")}
            >
              <HStack gap={2}>
                <Plus size={16} />
                <Text>New course</Text>
              </HStack>
            </AppButton>
          </Flex>

          {/* Course grid */}
          {coursesLoading ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {[...Array(4)].map((_, i) => (
                <CourseRowSkeleton key={i} />
              ))}
            </SimpleGrid>
          ) : visibleCourses.length === 0 ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={20}
              gap={3}
              color="gray.400"
            >
              <Text fontSize="lg" fontWeight="medium">
                No courses found
              </Text>
              <Text fontSize="sm">
                {search
                  ? "Try a different search term"
                  : "Create your first course to get started"}
              </Text>
            </Flex>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {visibleCourses.map((course) => (
                <CourseRow
                  key={course._id}
                  course={course}
                  showOwner={seesEverything}
                  onDelete={(id) =>
                    setPendingDelete(courses.find((c) => c._id === id) ?? null)
                  }
                  onClick={() => router.push(coursePaths.details(course._id))}
                />
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Box>

      {/* Delete confirmation modal */}
      {pendingDelete && (
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
            onClick={() => setPendingDelete(null)}
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
                    <strong>{pendingDelete.title}</strong>? This action cannot
                    be undone and all course content will be permanently
                    removed.
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
                    loading={deleting}
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
                    onClick={() => setPendingDelete(null)}
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
