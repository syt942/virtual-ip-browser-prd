/**
 * Integration Tests for Bulk Proxy Import/Export
 * Tests the complete import/export workflow with UI components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkProxyImportModal } from '../../src/components/browser/BulkProxyImportModal';
import type { ParsedProxy } from '../../src/utils/proxyParser';

describe('Bulk Proxy Import/Export Integration', () => {
  let mockOnImport: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnImport = vi.fn().mockResolvedValue(undefined);
    mockOnClose = vi.fn();
  });

  describe('BulkProxyImportModal', () => {
    it('renders modal when open', () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.getByText('Bulk Import Proxies')).toBeInTheDocument();
      expect(screen.getByText('Supported Formats:')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <BulkProxyImportModal
          isOpen={false}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      expect(screen.queryByText('Bulk Import Proxies')).not.toBeInTheDocument();
    });

    it('parses and displays valid proxies', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      // Enter proxy list
      fireEvent.change(textarea, {
        target: { value: '192.168.1.100:8080\nproxy.example.com:3128' },
      });

      // Parse
      fireEvent.click(parseButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Successful count
        expect(screen.getByText('Successful')).toBeInTheDocument();
      });
    });

    it('displays parse errors for invalid proxies', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      // Enter invalid proxy
      fireEvent.change(textarea, {
        target: { value: 'invalid-proxy-format\n192.168.1.100:99999' },
      });

      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText(/Failed to Parse/)).toBeInTheDocument();
      });
    });

    it('allows selecting/deselecting proxies', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      fireEvent.change(textarea, {
        target: { value: '192.168.1.100:8080\n192.168.1.101:8080' },
      });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('2 selected')).toBeInTheDocument();
      });

      // Find checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      
      // First checkbox is for row 1
      fireEvent.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.getByText('1 selected')).toBeInTheDocument();
      });
    });

    it('supports select all/deselect all', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      fireEvent.change(textarea, {
        target: { value: '192.168.1.100:8080\n192.168.1.101:8080\n192.168.1.102:8080' },
      });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('3 selected')).toBeInTheDocument();
      });

      // Click "Deselect All"
      const deselectButton = screen.getByText('Deselect All');
      fireEvent.click(deselectButton);

      await waitFor(() => {
        expect(screen.getByText('0 selected')).toBeInTheDocument();
      });

      // Click "Select All"
      const selectButton = screen.getByText('Select All');
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByText('3 selected')).toBeInTheDocument();
      });
    });

    it('imports selected proxies when import button clicked', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      fireEvent.change(textarea, {
        target: { value: '192.168.1.100:8080\n192.168.1.101:8080' },
      });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText(/Import 2 Proxies/)).toBeInTheDocument();
      });

      const importButton = screen.getByText(/Import 2 Proxies/);
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows progress during import', async () => {
      // Mock slow import
      mockOnImport = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      fireEvent.change(textarea, {
        target: { value: '192.168.1.100:8080' },
      });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText(/Import 1 Proxies/)).toBeInTheDocument();
      });

      const importButton = screen.getByText(/Import 1 Proxies/);
      fireEvent.click(importButton);

      // Should show importing state
      await waitFor(() => {
        expect(screen.getByText('Importing...')).toBeInTheDocument();
      });
    });

    it('applies default protocol setting', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');
      const protocolSelect = screen.getByLabelText('Default Protocol:');

      // Change to SOCKS5
      fireEvent.change(protocolSelect, { target: { value: 'socks5' } });

      fireEvent.change(textarea, {
        target: { value: '192.168.1.100:8080' },
      });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('SOCKS5')).toBeInTheDocument();
      });
    });

    it('removes duplicates when enabled', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');
      const removeDupsCheckbox = screen.getByLabelText('Remove duplicates');

      expect(removeDupsCheckbox).toBeChecked(); // Default enabled

      fireEvent.change(textarea, {
        target: { 
          value: '192.168.1.100:8080\n192.168.1.100:8080\n192.168.1.101:8080' 
        },
      });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Only 2 after dedup
      });
    });

    it('keeps duplicates when remove duplicates disabled', async () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');
      const removeDupsCheckbox = screen.getByLabelText('Remove duplicates');

      // Disable duplicate removal
      fireEvent.click(removeDupsCheckbox);

      fireEvent.change(textarea, {
        target: { 
          value: '192.168.1.100:8080\n192.168.1.100:8080\n192.168.1.101:8080' 
        },
      });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // All 3 kept
      });
    });

    it('closes modal when cancel clicked', () => {
      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents closing during import', async () => {
      mockOnImport = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      fireEvent.change(textarea, { target: { value: '192.168.1.100:8080' } });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText(/Import 1 Proxies/)).toBeInTheDocument();
      });

      const importButton = screen.getByText(/Import 1 Proxies/);
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Importing...')).toBeInTheDocument();
      });

      // Cancel button should be disabled
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });

    it('handles import errors gracefully', async () => {
      mockOnImport = vi.fn().mockRejectedValue(new Error('Import failed'));

      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      const parseButton = screen.getByText('Parse');

      fireEvent.change(textarea, { target: { value: '192.168.1.100:8080' } });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText(/Import 1 Proxies/)).toBeInTheDocument();
      });

      const importButton = screen.getByText(/Import 1 Proxies/);
      fireEvent.click(importButton);

      // Should handle error and re-enable UI
      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalled();
        // Modal should stay open on error
        expect(screen.getByText('Bulk Import Proxies')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('exports proxies in simple format', () => {
      const { exportProxies } = require('../../src/utils/proxyParser');
      
      const proxies = [
        { host: '192.168.1.100', port: 8080, protocol: 'http' },
        { host: '192.168.1.101', port: 8080, protocol: 'socks5' },
      ];

      const result = exportProxies(proxies, 'simple');

      expect(result).toContain('192.168.1.100:8080');
      expect(result).toContain('192.168.1.101:8080');
    });

    it('exports proxies in URL format with credentials', () => {
      const { exportProxies } = require('../../src/utils/proxyParser');
      
      const proxies = [
        { 
          host: '192.168.1.100', 
          port: 8080, 
          protocol: 'http',
          username: 'admin',
          password: 'secret',
        },
      ];

      const result = exportProxies(proxies, 'url');

      expect(result).toBe('http://admin:secret@192.168.1.100:8080');
    });

    it('exports proxies in CSV format', () => {
      const { exportProxies } = require('../../src/utils/proxyParser');
      
      const proxies = [
        { host: '192.168.1.100', port: 8080, protocol: 'http' },
      ];

      const result = exportProxies(proxies, 'csv');

      expect(result).toContain('host,port,protocol,username,password');
      expect(result).toContain('192.168.1.100,8080,http,,');
    });
  });

  describe('End-to-End Import/Export Workflow', () => {
    it('completes full import workflow', async () => {
      const importedProxies: ParsedProxy[] = [];
      mockOnImport = vi.fn().mockImplementation((proxies: ParsedProxy[]) => {
        importedProxies.push(...proxies);
        return Promise.resolve();
      });

      render(
        <BulkProxyImportModal
          isOpen={true}
          onClose={mockOnClose}
          onImport={mockOnImport}
        />
      );

      // Step 1: Paste proxy list
      const textarea = screen.getByPlaceholderText(/192.168.1.100:8080/);
      fireEvent.change(textarea, {
        target: { 
          value: `# My proxies
192.168.1.100:8080
http://proxy.example.com:3128
socks5://user:pass@10.0.0.1:1080` 
        },
      });

      // Step 2: Parse
      const parseButton = screen.getByText('Parse');
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });

      // Step 3: Import
      const importButton = screen.getByText(/Import 3 Proxies/);
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledTimes(3); // Called once per proxy
        expect(mockOnClose).toHaveBeenCalled();
      });

      // Verify imported data structure
      expect(importedProxies).toHaveLength(3);
      expect(importedProxies[0]).toMatchObject({
        host: '192.168.1.100',
        port: 8080,
        protocol: 'http',
      });
    });
  });
});
