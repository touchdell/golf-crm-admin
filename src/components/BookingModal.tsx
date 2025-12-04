import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useMembers } from '../hooks/useMembers';
import { useCreateBooking, useUpdateBooking, useBooking, useCancelBooking } from '../hooks/useBooking';
import { getBestPrice, mapMembershipTypeToSegment, getPriceItems, type BestPriceResult } from '../services/priceService';
import type { TeeTime } from '../services/teeTimeService';
import type { Member } from '../services/memberService';
import dayjs from 'dayjs';

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  teeTime: TeeTime | null;
  mainMember: Member | null; // Fixed main member - required and not selectable
  existingMemberIds?: number[]; // Members already booked in this slot (from other bookings)
  bookingId?: number | null; // Optional: if provided, edit mode is enabled
  onSaved?: () => void;
  onError?: (error: Error) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  open,
  onClose,
  teeTime,
  mainMember, // Fixed main member from props
  existingMemberIds = [], // Members already part of this tee time (any booking)
  bookingId = null, // Optional: if provided, edit mode is enabled
  onSaved,
  onError,
}) => {
  const [additionalMembers, setAdditionalMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState('');
  const [additionalMembersSearch, setAdditionalMembersSearch] = useState('');
  const [duplicateInCurrentBooking, setDuplicateInCurrentBooking] = useState<Member | null>(null);
  const [pricingInfo, setPricingInfo] = useState<BestPriceResult | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  
  // ✅ FIXED: Track if we've already loaded initial booking data to prevent overwriting user changes
  const hasLoadedInitialData = useRef(false);
  const lastBookingIdRef = useRef<number | null>(null);

  // Fetch members for additional players only (main member is fixed from props)
  const { data: additionalMembersData, isLoading: additionalMembersLoading } = useMembers(
    1,
    50,
    additionalMembersSearch,
  );

  const createBookingMutation = useCreateBooking();
  const updateBookingMutation = useUpdateBooking();
  const cancelBookingMutation = useCancelBooking();
  const isEditMode = !!bookingId;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Load existing booking data when in edit mode
  const { data: existingBooking, isLoading: loadingBooking } = useBooking(bookingId);

  // Reset form when modal opens/closes or teeTime changes
  useEffect(() => {
    if (open && teeTime) {
      // ✅ FIXED: Only load initial data when modal opens or bookingId changes
      // Don't reload if existingBooking refetches - this would overwrite user changes
      const bookingIdChanged = lastBookingIdRef.current !== bookingId;
      
      if (bookingId && existingBooking && (!hasLoadedInitialData.current || bookingIdChanged)) {
        // Edit mode: pre-populate with existing booking data (only on initial load)
        console.log('🔄 Loading initial booking data for edit mode:', bookingId);
        const existingPlayers = existingBooking.players || [];
        const additionalPlayers = existingPlayers.filter(p => !p.isMainPlayer);
        
        // Map additional players to Member objects using booking data
        const mappedAdditional = additionalPlayers.map(player => {
          // Parse memberName (format: "FirstName LastName")
          const nameParts = player.memberName.split(' ');
          const firstName = nameParts[0] || player.memberName;
          const lastName = nameParts.slice(1).join(' ') || '';
          
          return {
            id: player.memberId,
            firstName,
            lastName,
            memberCode: player.memberCode,
            membershipType: '', // Not available in booking data
            membershipStatus: 'ACTIVE' as const, // Default
          };
        });
        
        console.log('🔄 Setting initial additionalMembers:', mappedAdditional.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })));
        setAdditionalMembers(mappedAdditional);
        setNotes(existingBooking.notes || '');
        hasLoadedInitialData.current = true;
        lastBookingIdRef.current = bookingId;
      } else if (!bookingId) {
        // Create mode: reset form
        setAdditionalMembers([]);
        setNotes('');
        hasLoadedInitialData.current = false;
        lastBookingIdRef.current = null;
      }
      setAdditionalMembersSearch('');
      setDuplicateInCurrentBooking(null); // Reset duplicate error
    } else if (!open) {
      // Modal closed: reset flags
      hasLoadedInitialData.current = false;
      lastBookingIdRef.current = null;
    }
  }, [open, teeTime?.id, bookingId, existingBooking]); // Keep existingBooking in deps for initial load, but use ref to prevent overwriting changes
  
  // ✅ DEBUG: Log when additionalMembers changes
  useEffect(() => {
    if (additionalMembers.length > 0) {
      console.log('Selected additional members:', additionalMembers.map(m => `${m.firstName} ${m.lastName} (${m.id})`));
    }
  }, [additionalMembers]);

  // Calculate pricing when teeTime, mainMember, or additionalMembers change
  useEffect(() => {
    const calculatePricing = async () => {
      if (!teeTime || !mainMember || !open) {
        console.log('[Pricing] Skipping calculation - missing requirements:', {
          hasTeeTime: !!teeTime,
          hasMainMember: !!mainMember,
          isOpen: open,
        });
        setPricingInfo(null);
        return;
      }

      console.log('[Pricing] Starting calculation:', {
        teeDate: teeTime.date,
        teeTime: teeTime.startTime,
        courseId: teeTime.courseId,
        mainMemberId: mainMember.id,
        membershipType: mainMember.membershipType,
        numAdditionalPlayers: additionalMembers.length,
      });

      setLoadingPricing(true);
      try {
        // Get base price items (green fee, caddy, cart)
        const priceItems = await getPriceItems();
        console.log('[Pricing] Price items loaded:', priceItems.length);
        
        const greenFee = priceItems.find(item => item.category === 'GREEN_FEE' && item.isActive);
        const caddy = priceItems.find(item => item.category === 'CADDY' && item.isActive);
        const cart = priceItems.find(item => item.category === 'CART' && item.isActive);

        // Calculate base price (sum of all active price items)
        const basePrice = (greenFee?.unitPrice || 0) + (caddy?.unitPrice || 0) + (cart?.unitPrice || 0);
        console.log('[Pricing] Base price calculated:', {
          basePrice,
          greenFee: greenFee?.unitPrice || 0,
          caddy: caddy?.unitPrice || 0,
          cart: cart?.unitPrice || 0,
        });

        // Get member segment from membership type
        const memberSegment = mapMembershipTypeToSegment(mainMember.membershipType);
        console.log('[Pricing] Member segment:', {
          membershipType: mainMember.membershipType,
          mappedSegment: memberSegment,
        });

        // Calculate total number of players
        const numPlayers = 1 + additionalMembers.length; // Main member + additional

        // Get best price with promotion
        console.log('[Pricing] Calling getBestPrice with:', {
          teeDate: teeTime.date,
          teeTime: teeTime.startTime,
          basePrice,
          memberSegment,
          courseId: teeTime.courseId,
          numPlayers,
        });
        
        const bestPrice = await getBestPrice({
          teeDate: teeTime.date,
          teeTime: teeTime.startTime,
          basePrice,
          memberSegment,
          courseId: teeTime.courseId,
          numPlayers,
        });

        console.log('[Pricing] Best price result:', bestPrice);
        setPricingInfo(bestPrice);
      } catch (error) {
        console.error('[Pricing] Error calculating pricing:', error);
        // Fallback: show base pricing even on error
        try {
          const priceItems = await getPriceItems();
          const greenFee = priceItems.find(item => item.category === 'GREEN_FEE' && item.isActive);
          const caddy = priceItems.find(item => item.category === 'CADDY' && item.isActive);
          const cart = priceItems.find(item => item.category === 'CART' && item.isActive);
          const basePrice = (greenFee?.unitPrice || 0) + (caddy?.unitPrice || 0) + (cart?.unitPrice || 0);
          
          setPricingInfo({
            finalPrice: basePrice,
            basePrice,
            source: 'BASE',
            includesGreenFee: true,
            includesCaddy: true,
            includesCart: true,
          });
        } catch (fallbackError) {
          console.error('[Pricing] Fallback pricing also failed:', fallbackError);
          setPricingInfo(null);
        }
      } finally {
        setLoadingPricing(false);
      }
    };

    calculatePricing();
  }, [teeTime?.id, teeTime?.date, teeTime?.startTime, teeTime?.courseId, mainMember?.id, mainMember?.membershipType, additionalMembers.length, open]);

  /**
   * Validates and deduplicates players to ensure no duplicate members in a booking.
   * Throws an error if duplicates are found.
   */
  const validateAndDeduplicatePlayers = (
    mainMember: Member,
    additionalMembers: Member[]
  ): Array<{ memberId: number; isMainPlayer: boolean }> => {
    // Track all member IDs
    const seenMemberIds = new Set<number>();
    const duplicateMemberIds: number[] = [];
    const players: Array<{ memberId: number; isMainPlayer: boolean }> = [];

    // Add main member first
    if (mainMember?.id) {
      seenMemberIds.add(mainMember.id);
      players.push({
        memberId: mainMember.id,
        isMainPlayer: true,
      });
    }

    // Process additional members
    for (const member of additionalMembers) {
      if (!member?.id) {
        continue; // Skip invalid members
      }

      // Check for duplicates
      if (seenMemberIds.has(member.id)) {
        duplicateMemberIds.push(member.id);
        continue; // Skip duplicate
      }

      // Check if additional member is the same as main member
      if (member.id === mainMember?.id) {
        duplicateMemberIds.push(member.id);
        continue; // Skip - main member cannot be additional
      }

      // Add to seen set and players array
      seenMemberIds.add(member.id);
      players.push({
        memberId: member.id,
        isMainPlayer: false,
      });
    }

    // If duplicates found, throw error
    if (duplicateMemberIds.length > 0) {
      const duplicateMembers = additionalMembers
        .filter(m => duplicateMemberIds.includes(m.id))
        .map(m => `${m.firstName} ${m.lastName} (${m.memberCode})`)
        .join(', ');
      
      throw new Error(
        `Duplicate members detected: ${duplicateMembers}. ` +
        `Each member can only appear once per booking.`
      );
    }

    return players;
  };

  const handleSubmit = async () => {
    if (!teeTime) {
      console.error('Cannot save booking: No tee time selected');
      return;
    }

    if (!mainMember) {
      console.error('Cannot save booking: No main member provided');
      onError?.(new Error('No main member selected. Please select a member before booking.'));
      return;
    }

    const isEditMode = !!bookingId;
    const existingMemberIdSet = new Set(existingMemberIds);
    
    // ✅ DEBUG: Log current state before processing
    console.log('🔍 handleSubmit - Current state:', {
      additionalMembersCount: additionalMembers.length,
      additionalMembers: additionalMembers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })),
      mainMember: { id: mainMember.id, name: `${mainMember.firstName} ${mainMember.lastName}` },
      isEditMode,
    });
    
    // ✅ FIXED: Client-side validation - Check if main member is duplicate
    // In edit mode, skip this check if the main member is the same as the existing booking's main member
    if (!isEditMode && existingMemberIdSet.has(mainMember.id)) {
      const errorMsg = `Member ${mainMember.firstName} ${mainMember.lastName} (${mainMember.memberCode}) is already a main member in another booking for this tee time slot. Please select a different member.`;
      console.error('Duplicate main member detected:', mainMember.id);
      onError?.(new Error(errorMsg));
      return;
    }

    // ✅ VALIDATE: Ensure no duplicate members within this booking
    let players: Array<{ memberId: number; isMainPlayer: boolean }>;
    try {
      console.log('🔍 Calling validateAndDeduplicatePlayers with:', {
        mainMemberId: mainMember.id,
        additionalMembersCount: additionalMembers.length,
        additionalMembersIds: additionalMembers.map(m => m.id),
      });
      players = validateAndDeduplicatePlayers(mainMember, additionalMembers);
      console.log('✅ validateAndDeduplicatePlayers returned:', {
        playersCount: players.length,
        players: players.map(p => ({ memberId: p.memberId, isMainPlayer: p.isMainPlayer })),
      });
    } catch (error) {
      // Validation error - show to user
      const errorMessage = error instanceof Error ? error.message : 'Duplicate members detected in booking';
      console.error('Player validation error:', errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return;
    }

    // ✅ VALIDATE: Check if any players are already booked in OTHER bookings for this slot
    // In edit mode, exclude current booking's players from duplicate check
    const currentBookingPlayerIds = isEditMode && existingBooking 
      ? new Set(existingBooking.players.map(p => p.memberId))
      : new Set<number>();
    
    const excludedMemberIdsSet = new Set(existingMemberIds);
    
    // Check for conflicts with other bookings (not this booking in edit mode)
    const conflictingPlayers = players.filter((p) => {
      // In edit mode, allow players that are already in this booking
      if (isEditMode && currentBookingPlayerIds.has(p.memberId)) {
        return false; // Not a conflict if it's already in this booking
      }
      // Check if this member is already booked in another booking
      return excludedMemberIdsSet.has(p.memberId);
    });

    if (conflictingPlayers.length > 0) {
      const conflictingMemberIds = conflictingPlayers.map(p => p.memberId);
      const conflictingMemberNames = additionalMembers
        .filter(m => conflictingMemberIds.includes(m.id))
        .map(m => `${m.firstName} ${m.lastName} (${m.memberCode})`)
        .join(', ');
      
      const errorMsg = `The following members are already booked in another booking for this slot and cannot be added: ${conflictingMemberNames}`;
      console.error('Conflicting members detected:', conflictingMemberIds);
      onError?.(new Error(errorMsg));
      return;
    }

    console.log(`${isEditMode ? 'Updating' : 'Creating'} booking with:`, {
      bookingId: bookingId || 'new',
      teeTime: teeTime.id,
      date: teeTime.date,
      time: teeTime.startTime,
      players: players.length,
      mainMember: mainMember.id,
      playerIds: players.map((p) => p.memberId),
    });

    try {
      if (isEditMode && bookingId) {
        // Update existing booking
        await updateBookingMutation.mutateAsync({
          id: bookingId,
          payload: {
            players,
            notes: notes.trim() || undefined,
          },
        });
      } else {
        // Create new booking
        await createBookingMutation.mutateAsync({
          teeTimeId: teeTime.id, // Optional - kept for backward compatibility
          date: teeTime.date,
          time: teeTime.startTime, // Use startTime from teeTime object
          players,
          notes: notes.trim() || undefined,
        });
      }
      // Only call onSaved on success
      onSaved?.();
      onClose();
    } catch (error: any) {
      // Error is handled by the mutation and UI (isError state)
      console.error(`Booking ${isEditMode ? 'update' : 'creation'} error:`, error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      console.error('Error details:', {
        error,
        message: errorMessage,
        stack: error?.stack,
      });
      // Also notify parent component
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      // Don't close modal on error so user can retry
    }
  };

  const handleClose = () => {
    if (!createBookingMutation.isPending) {
      onClose();
    }
  };

  // ✅ FIXED: Compute dynamic counts based on existing players + new selections
  const maxPlayers = teeTime?.maxPlayers || 0;

  // How many players were already booked in this tee time (before opening modal)
  const originalAvailableSlots = teeTime
    ? teeTime.maxPlayers - teeTime.bookedPlayersCount
    : 0;

  // Members already in this tee-time group (from any existing booking)
  const existingMemberIdSet = new Set(existingMemberIds);
  
  // Calculate remaining slots (accounting for edit mode)
  const allSelectedPlayerIds = new Set([
    mainMember?.id,
    ...additionalMembers.map(m => m.id)
  ].filter((id): id is number => id !== undefined));
  
  let remainingSlots: number;
  if (isEditMode && existingBooking) {
    // Edit mode: calculate net change (players being added - players being removed)
    const currentPlayerIds = new Set(existingBooking.players.map(p => p.memberId));
    const playersBeingAdded = Array.from(allSelectedPlayerIds).filter(
      id => !currentPlayerIds.has(id)
    ).length;
    const playersBeingRemoved = Array.from(currentPlayerIds).filter(
      id => !allSelectedPlayerIds.has(id)
    ).length;
    const netChange = playersBeingAdded - playersBeingRemoved;
    remainingSlots = Math.max(0, originalAvailableSlots - netChange);
  } else {
    // Create mode: count new players being added
    const newPlayersCount = Array.from(allSelectedPlayerIds).filter(
      id => !existingMemberIdSet.has(id)
    ).length;
    remainingSlots = Math.max(0, originalAvailableSlots - newPlayersCount);
  }

  // Selection count for UI (main + additional in this modal)
  const selectedCount = (mainMember ? 1 : 0) + additionalMembers.length;

  // ✅ FIXED: Ensure options array is stable - use raw items, no object rebuilding
  // Filter out:
  //  - main member (NEVER allow main member as additional player)
  //  - members already selected as additional (prevent duplicates within current selection)
  //  - members already booked in this tee time (existingMemberIds from other bookings)
  const allAdditionalMembers = additionalMembersData?.items || [];
  
  // ✅ FIXED: Create a comprehensive exclusion set that includes main member
  const excludedMemberIdsSet = new Set<number>();
  // Add existing member IDs (from other bookings in this slot)
  existingMemberIds.forEach((id) => excludedMemberIdsSet.add(id));
  
  // In edit mode, get current booking's player IDs
  const currentBookingPlayerIds = isEditMode && existingBooking 
    ? new Set(existingBooking.players.map(p => p.memberId))
    : new Set<number>();
  
  // In edit mode, exclude current booking's players from exclusion set for OTHER bookings
  // BUT we still want to exclude them from the dropdown to prevent re-adding them
  // (they're already in the booking, so they'll show as selected chips)
  
  // Add main member ID explicitly (ALWAYS exclude from dropdown)
  if (mainMember?.id) {
    excludedMemberIdsSet.add(mainMember.id);
  }
  
  // ✅ FIXED: Check if main member is already booked in this slot (separate from excludedMemberIdsSet)
  // This is used to prevent duplicate main members, not for filtering dropdown options
  // Note: existingMemberIdSet is already defined above (line 176), reuse it here
  const isMainMemberDuplicate = mainMember ? existingMemberIdSet.has(mainMember.id) : false;
  
  // ✅ FIXED: Build options array - Include selected members so MUI can manage them properly
  // MUI Autocomplete multiple mode needs selected options to remain in the options array
  // We'll use isOptionDisabled to prevent re-selection instead of filtering them out
  const filteredOptions = allAdditionalMembers.filter(
    (m) => {
      const isMainMember = m.id === mainMember?.id;
      const isExcluded = excludedMemberIdsSet.has(m.id);
      // In edit mode, also exclude current booking's players (they're already in the booking)
      const isCurrentBookingPlayer = isEditMode && currentBookingPlayerIds.has(m.id);
      
      // Exclude if: main member, excluded from other bookings, or already in current booking
      // DO NOT exclude selected members - MUI needs them in the options array
      return !isMainMember && !isExcluded && !isCurrentBookingPlayer;
    }
  );
  
  // ✅ CRITICAL FIX: Ensure selected members are always in options array
  // MUI Autocomplete needs selected values to exist in options for proper matching
  // Create a Set of option IDs for quick lookup
  const optionIdsSet = new Set(filteredOptions.map(m => m.id));
  
  // Add any selected members that aren't in the filtered options
  const additionalMembersOptions = [
    ...filteredOptions,
    ...additionalMembers.filter(m => !optionIdsSet.has(m.id))
  ];
  
  // ✅ NEW: Check if any selected additional members are duplicates or main member
  // This includes:
  // 1. Main member appearing in additional members
  // 2. Members already booked in other bookings
  // 3. Duplicate members within additionalMembers array itself
  const seenMemberIds = new Set<number>();
  const duplicateAdditionalMembers = additionalMembers.filter(
    (m) => {
      // Check if this member is the main member
      if (m.id === mainMember?.id) {
        return true; // Main member cannot be additional
      }
      
      // Check if this member is already booked in other bookings
      if (excludedMemberIdsSet.has(m.id)) {
        return true; // Already booked elsewhere
      }
      
      // In edit mode, allow players that are already in this booking (they're being kept)
      if (isEditMode && currentBookingPlayerIds.has(m.id)) {
        return false; // Not a duplicate if it's already in this booking
      }
      
      // Check for duplicates within additionalMembers array
      if (seenMemberIds.has(m.id)) {
        return true; // Duplicate within the same array
      }
      seenMemberIds.add(m.id);
      
      return false;
    }
  );

  const isPending = isEditMode ? updateBookingMutation.isPending : createBookingMutation.isPending;
  const hasError = isEditMode ? updateBookingMutation.isError : createBookingMutation.isError;
  const error = isEditMode ? updateBookingMutation.error : createBookingMutation.error;

  // ✅ FIXED: No dynamic key props - Dialog key is stable
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode
          ? `Edit Booking: ${teeTime?.startTime} - ${teeTime?.endTime}`
          : teeTime
            ? `Book Tee Time: ${teeTime.startTime} - ${teeTime.endTime}`
            : 'Create Booking'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Tee Time Info */}
          {teeTime && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tee Time Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Date: {dayjs(teeTime.date).format('MMMM DD, YYYY')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Time: {teeTime.startTime} - {teeTime.endTime}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Course ID: {teeTime.courseId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Capacity: {maxPlayers} players per tee time
                </Typography>
                {originalAvailableSlots < maxPlayers && (
                  <Typography variant="body2" color="text.secondary">
                    Slots available before this booking: {originalAvailableSlots}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium', mt: 0.5 }}>
                  Remaining slots for this booking: {remainingSlots}
                </Typography>
              </Box>
              {teeTime.status === 'BLOCKED' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This tee time is blocked and cannot be booked.
                </Alert>
              )}
              {originalAvailableSlots === 0 && teeTime.status !== 'BLOCKED' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  This tee time is full.
                </Alert>
              )}
            </Box>
          )}

          <Divider />

          {/* Pricing Information - Always show if teeTime and mainMember exist */}
          {(teeTime && mainMember) && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Pricing
              </Typography>
              {loadingPricing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Calculating pricing...
                  </Typography>
                </Box>
              ) : pricingInfo ? (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: pricingInfo.source === 'PROMOTION' ? 'success.light' : 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: pricingInfo.source === 'PROMOTION' ? 'success.main' : 'divider',
                  }}
                >
                  {pricingInfo.source === 'PROMOTION' && (
                    <Alert severity="success" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        🎉 Promotion Applied: {pricingInfo.promotionName || pricingInfo.promotionCode}
                      </Typography>
                    </Alert>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {pricingInfo.basePrice !== pricingInfo.finalPrice && (
                      <Typography variant="body2" color="text.secondary">
                        Base Price: <span style={{ textDecoration: 'line-through' }}>{pricingInfo.basePrice.toFixed(2)} THB</span>
                      </Typography>
                    )}
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      Final Price: {pricingInfo.finalPrice.toFixed(2)} THB
                    </Typography>
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Includes:
                      </Typography>
                      <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                        {pricingInfo.includesGreenFee && <li>Green Fee</li>}
                        {pricingInfo.includesCaddy && <li>Caddy</li>}
                        {pricingInfo.includesCart && <li>Cart</li>}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Alert severity="info" sx={{ p: 2 }}>
                  <Typography variant="body2">
                    Pricing information will be calculated automatically.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          <Divider />

          {/* Main Member Display (Fixed, Read-only) */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Main Member
            </Typography>
            {mainMember && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body1" fontWeight="medium">
                  {mainMember.firstName} {mainMember.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Member Code: {mainMember.memberCode}
                </Typography>
                <Chip
                  label="Fixed"
                  size="small"
                  color="primary"
                  sx={{ mt: 1 }}
                />
              </Box>
            )}
          </Box>

          {/* Additional Players */}
          {mainMember && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Additional Players (Optional)
              </Typography>
              {(existingMemberIds && existingMemberIds.length > 0) || mainMember ? (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Note: {mainMember ? 'Main member is excluded. ' : ''}
                  {existingMemberIds && existingMemberIds.length > 0 
                    ? `${existingMemberIds.length} member(s) already booked in this slot are excluded.`
                    : ''}
                </Typography>
              ) : null}
              {duplicateAdditionalMembers.length > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  ⚠️ The following members are already booked in this slot and cannot be added:
                  <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                    {duplicateAdditionalMembers.map((m) => (
                      <li key={m.id}>
                        {m.firstName} {m.lastName} ({m.memberCode})
                      </li>
                    ))}
                  </Box>
                </Alert>
              )}
              {duplicateInCurrentBooking && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  ⚠️ {duplicateInCurrentBooking.firstName} {duplicateInCurrentBooking.lastName} ({duplicateInCurrentBooking.memberCode}) is already in this booking and cannot be added again.
                </Alert>
              )}
              <Autocomplete
                multiple
                // ✅ FIXED: Fully controlled Autocomplete with stable options
                options={additionalMembersOptions}
                value={additionalMembers} // Always an array, never null/undefined
                // ✅ FIXED: Critical - equality check by ID to prevent MUI from losing selection
                isOptionEqualToValue={(option, value) => option.id === value.id}
                // ✅ REMOVED: filterOptions was causing issues with single selection
                // The options are already filtered in additionalMembersOptions above
                // Removing custom filterOptions to let MUI handle filtering naturally
                getOptionLabel={(option) => {
                  const isMainMember = option.id === mainMember?.id;
                  const isExcluded = excludedMemberIdsSet.has(option.id);
                  let suffix = '';
                  if (isMainMember) {
                    suffix = ' - Main member';
                  } else if (isExcluded) {
                    suffix = ' - Already booked';
                  }
                  return `${option.firstName} ${option.lastName} (${option.memberCode})${suffix}`;
                }}
                onChange={(_, newValue) => {
                  console.log('🔍 onChange called:', {
                    newValueLength: newValue.length,
                    newValueIds: newValue.map(m => m.id),
                    currentAdditionalMembersLength: additionalMembers.length,
                    currentAdditionalMembersIds: additionalMembers.map(m => m.id),
                  });
                  
                  // Clear any previous duplicate error
                  setDuplicateInCurrentBooking(null);
                  
                  // ✅ FIXED: Filter out main member and excluded members before setting
                  let filteredNewValue = newValue.filter(
                    (m) => m.id !== mainMember?.id && !excludedMemberIdsSet.has(m.id),
                  );
                  
                  console.log('🔍 After filtering:', {
                    filteredLength: filteredNewValue.length,
                    filteredIds: filteredNewValue.map(m => m.id),
                  });
                  
                  // ✅ NEW: Check if any member being added is already in the current booking
                  if (isEditMode && existingBooking) {
                    const currentBookingPlayerIds = new Set(existingBooking.players.map(p => p.memberId));
                    const currentSelectedIds = new Set(additionalMembers.map(m => m.id));
                    
                    // Find newly added members (in newValue but not in current additionalMembers)
                    const newlyAddedMembers = filteredNewValue.filter(
                      m => !currentSelectedIds.has(m.id)
                    );
                    
                    // Check if any newly added member is already in the current booking
                    const duplicateMember = newlyAddedMembers.find(m => currentBookingPlayerIds.has(m.id));
                    
                    if (duplicateMember) {
                      console.log('🚫 Duplicate in current booking detected:', duplicateMember.id);
                      // Member already exists in current booking - show error and prevent adding
                      setDuplicateInCurrentBooking(duplicateMember);
                      // Don't update the state, keep current selection
                      return;
                    }
                  }
                  
                  // ✅ VALIDATE: Deduplicate by memberId (prevent same member appearing twice)
                  // Use Map to keep first occurrence of each memberId
                  // ✅ CRITICAL: Use member objects from options/state to ensure object reference consistency
                  const uniqueMembersMap = new Map<number, Member>();
                  
                  // Create a lookup map of all available members (from options + current state)
                  const allAvailableMembersMap = new Map<number, Member>();
                  additionalMembersOptions.forEach(m => allAvailableMembersMap.set(m.id, m));
                  additionalMembers.forEach(m => {
                    if (!allAvailableMembersMap.has(m.id)) {
                      allAvailableMembersMap.set(m.id, m);
                    }
                  });
                  
                  filteredNewValue.forEach((member) => {
                    if (!uniqueMembersMap.has(member.id)) {
                      // Use the member object from our lookup map if available, otherwise use the one from MUI
                      const memberToUse = allAvailableMembersMap.get(member.id) || member;
                      uniqueMembersMap.set(member.id, memberToUse);
                    }
                    // Silently deduplicate - if duplicate exists, keep first occurrence
                  });
                  
                  filteredNewValue = Array.from(uniqueMembersMap.values());
                  
                  console.log('🔍 After deduplication:', {
                    filteredLength: filteredNewValue.length,
                    filteredIds: filteredNewValue.map(m => m.id),
                  });
                  
                  // ✅ FIXED: Calculate max allowed based on current state
                  // Need to recalculate here because maxAdditionalPlayers might be stale
                  let currentMaxAdditional: number;
                  if (isEditMode) {
                    // Edit mode: Can have up to maxPlayers total
                    currentMaxAdditional = Math.max(0, maxPlayers - 1);
                  } else {
                    // Create mode: Based on original available slots minus main member (if new)
                    const mainMemberConsumesSlot = mainMember && !existingMemberIdSet.has(mainMember.id);
                    currentMaxAdditional = Math.max(0, originalAvailableSlots - (mainMemberConsumesSlot ? 1 : 0));
                  }
                  
                  console.log('🔍 Max check:', {
                    filteredNewValueLength: filteredNewValue.length,
                    currentMaxAdditional,
                    currentAdditionalMembersLength: additionalMembers.length,
                    willUpdate: filteredNewValue.length <= currentMaxAdditional || filteredNewValue.length < additionalMembers.length,
                  });
                  
                  // ✅ FIXED: Always allow removing members, restrict only when adding
                  // Check if the new selection exceeds the maximum allowed additional players
                  if (filteredNewValue.length <= currentMaxAdditional) {
                    console.log('✅ Updating additionalMembers state:', filteredNewValue.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })));
                    setAdditionalMembers(filteredNewValue);
                  } else if (filteredNewValue.length < additionalMembers.length) {
                    // Allow reducing the list even if it was over limit
                    console.log('✅ Allowing reduction:', filteredNewValue.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })));
                    setAdditionalMembers(filteredNewValue);
                  } else {
                    console.log('❌ NOT updating - exceeds limit:', {
                      filteredLength: filteredNewValue.length,
                      maxAllowed: currentMaxAdditional,
                      currentLength: additionalMembers.length,
                    });
                  }
                  // If trying to add beyond limit or excluded member, keep current selection (don't update)
                }}
                getOptionDisabled={(option: Member) => {
                  // Disable main member (should never appear, but safety check)
                  if (option.id === mainMember?.id) {
                    return true;
                  }
                  // Disable members already booked in other bookings
                  if (excludedMemberIdsSet.has(option.id)) {
                    return true;
                  }
                  // In edit mode, disable members already in current booking
                  if (isEditMode && currentBookingPlayerIds.has(option.id)) {
                    return true;
                  }
                  // ✅ FIXED: Do NOT disable already selected members
                  // MUI Autocomplete multiple mode needs selected options to be enabled
                  // so they can be toggled off. The onChange handler will prevent duplicates.
                  return false;
                }}
                onInputChange={(_, newInputValue) => {
                  setAdditionalMembersSearch(newInputValue);
                }}
                loading={additionalMembersLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Add Players"
                    placeholder="Search and select additional players..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const isDuplicate = existingMemberIdSet.has(option.id);
                    return (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={`${option.firstName} ${option.lastName}`}
                        color={isDuplicate ? 'error' : 'default'}
                        onDelete={
                          isDuplicate
                            ? undefined
                            : getTagProps({ index }).onDelete
                        }
                      />
                    );
                  })
                }
                renderOption={(props, option) => {
                  const isMainMember = option.id === mainMember?.id;
                  const isExcluded = excludedMemberIdsSet.has(option.id);
                  return (
                    <Box
                      component="li"
                      {...props}
                      sx={{
                        ...((isMainMember || isExcluded) && {
                          opacity: 0.5,
                          textDecoration: 'line-through',
                        }),
                      }}
                    >
                      {option.firstName} {option.lastName} ({option.memberCode})
                      {isMainMember && ' - Main member'}
                      {isExcluded && !isMainMember && ' - Already booked'}
                    </Box>
                  );
                }}
                // ✅ FIXED: Don't disable entire Autocomplete when max reached
                // Only disable if tee time is blocked or no slots available originally
                // User should still be able to remove players even at max
                disabled={!teeTime || teeTime.status === 'BLOCKED' || originalAvailableSlots === 0}
              />
              {/* ✅ FIXED: Show dynamic selection count that updates live */}
              {selectedCount > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Selected: {selectedCount} / {maxPlayers} players
                </Typography>
              )}
              {selectedCount >= maxPlayers && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Maximum number of players reached for this tee time.
                </Alert>
              )}
            </Box>
          )}

          {/* Notes */}
          <TextField
            label="Notes (optional)"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any special requests or notes..."
            disabled={!teeTime || teeTime.status === 'BLOCKED'}
          />

          {/* Error Message */}
          {hasError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="medium">
                Failed to {isEditMode ? 'update' : 'create'} booking
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {(() => {
                  if (error instanceof Error) {
                    return error.message;
                  }
                  if (typeof error === 'string') {
                    return error;
                  }
                  return 'Please try again. Check the browser console for details.';
                })()}
              </Typography>
            </Alert>
          )}
          {loadingBooking && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Loading booking details...
            </Alert>
          )}
          {!mainMember && (
            <Alert severity="error" sx={{ mb: 2 }}>
              No main member selected. Please close this modal and select a member first.
            </Alert>
          )}
          {!mainMember && (
            <Alert severity="error">
              No main member selected. Please close this modal and select a member first.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {isEditMode && (
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            color="error"
            disabled={isPending || loadingBooking || cancelBookingMutation.isPending}
            startIcon={cancelBookingMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ mr: 'auto' }}
          >
            {cancelBookingMutation.isPending ? 'Deleting...' : 'Delete Booking'}
          </Button>
        )}
        <Button onClick={handleClose} disabled={isPending || loadingBooking || cancelBookingMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !teeTime ||
            teeTime.status === 'BLOCKED' ||
            !mainMember ||
            isPending ||
            loadingBooking ||
            cancelBookingMutation.isPending ||
            (!isEditMode && originalAvailableSlots === 0) || // Only check slots for new bookings
            duplicateAdditionalMembers.length > 0 ||
            (!isEditMode && isMainMemberDuplicate) // Prevent duplicate main member only for new bookings
          }
          startIcon={
            isPending ? <CircularProgress size={16} /> : null
          }
        >
          {isPending 
            ? (isEditMode ? 'Updating...' : 'Creating...') 
            : (isEditMode ? 'Update Booking' : 'Create Booking')}
        </Button>
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !cancelBookingMutation.isPending && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Booking</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this booking? This action cannot be undone.
          </Typography>
          {existingBooking && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Booking Details:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {dayjs(existingBooking.teeTime?.date).format('MMMM DD, YYYY')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time: {existingBooking.teeTime?.startTime}
              </Typography>
              {existingBooking.players && existingBooking.players.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Main Member: {existingBooking.players.find(p => p.isMainPlayer)?.memberName || 'N/A'}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={cancelBookingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!bookingId) return;
              try {
                await cancelBookingMutation.mutateAsync({
                  id: bookingId,
                  reason: 'Deleted from tee sheet',
                });
                setDeleteDialogOpen(false);
                onSaved?.(); // Refresh the tee sheet
                onClose(); // Close the modal
              } catch (error) {
                onError?.(error instanceof Error ? error : new Error('Failed to delete booking'));
              }
            }}
            color="error"
            variant="contained"
            disabled={cancelBookingMutation.isPending}
            startIcon={cancelBookingMutation.isPending ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {cancelBookingMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default BookingModal;

