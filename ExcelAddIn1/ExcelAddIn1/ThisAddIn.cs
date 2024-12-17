using System;
using System.Collections.Generic;
using System.Net.Sockets;
using Microsoft.Office.Interop.Excel;
using Microsoft.Office.Core;
using Newtonsoft.Json;

namespace ExcelAddIn1
{
    public partial class ThisAddIn
    {
        private TcpClient _client;
        private NetworkStream _stream;
        private readonly string serverIP = "127.0.0.1"; // Replace with your server's IP
        private readonly int serverPort = 8080;         // TCP port
        private Dictionary<string, string> previousValues = new Dictionary<string, string>();

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            InitializeConnection();
            AddContextMenu();

            // Attach events for Workbook_SheetCalculate and Workbook_SheetChange
            this.Application.SheetCalculate += Application_SheetCalculate;
            this.Application.SheetChange += Application_SheetChange;
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
            CloseConnection();
        }

        private void InitializeConnection()
        {
            try
            {
                if (_client == null || !_client.Connected)
                {
                    _client = new TcpClient(serverIP, serverPort);
                    _stream = _client.GetStream();
                    System.Windows.Forms.MessageBox.Show("TCP connection initialized.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error initializing connection: {ex.Message}");
            }
        }

        private void CloseConnection()
        {
            try
            {
                _stream?.Close();
                _client?.Close();
                Console.WriteLine("TCP connection closed.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error closing connection: {ex.Message}");
            }
        }

        // Class-level variable to retain the button reference
        private CommandBarButton linkToBrowserButton;

        private void AddContextMenu()
        {
            try
            {
                var commandBars = Globals.ThisAddIn.Application.CommandBars;
                var menuCommandBar = commandBars["Cell"];

                // Remove existing "Link to Browser" menu item to avoid duplicates
                foreach (CommandBarControl control in menuCommandBar.Controls)
                {
                    if (control.Caption == "Link to Browser")
                    {
                        control.Delete();
                        break;
                    }
                }

                // Add a new menu item
                var controll = menuCommandBar.Controls.Add(
                    MsoControlType.msoControlButton,
                    Temporary: true
                );

                if (controll is CommandBarButton button)
                {
                    // Set caption and event handler
                    button.Caption = "Link to Browser";
                    button.FaceId = 479; // Optional: Add an icon
                    button.Click += Button_Click;

                    // Retain reference to prevent garbage collection
                    linkToBrowserButton = button;
                }
            }
            catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show($"Error adding context menu: {ex.Message}");
            }
        }

        private void Button_Click(CommandBarButton Ctrl, ref bool CancelDefault)
        {
            LinkCellToBrowser();
        }



        private void LinkCellToBrowser()
        {
            var selection = Globals.ThisAddIn.Application.ActiveCell;
            SendToTcpServer(selection.Address, "10000000");
            System.Windows.Forms.MessageBox.Show($"Cell {selection.Address} linked copied.");
        }

        private void SendToTcpServer(string cellAddress, string cellValue)
        {
            try
            {
                if (_client == null || !_client.Connected)
                {
                    InitializeConnection();
                }

                var message = new
                {
                    targetApp = "NG",
                    payload = new
                    {
                        cellAddress = cellAddress,
                        cellValue = cellValue
                    }
                };

                string jsonMessage = JsonConvert.SerializeObject(message) + "\n";
                byte[] data = System.Text.Encoding.UTF8.GetBytes(jsonMessage);

                _stream.Write(data, 0, data.Length);
                _stream.Flush();

                Console.WriteLine($"Data sent to server: {jsonMessage}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending data: {ex.Message}");
            }
        }

        private void Application_SheetCalculate(object Sh)
        {
            Worksheet worksheet = Sh as Worksheet;
            if (worksheet == null) return;

            Range monitoredRange = worksheet.Range["A1:Z30"]; // Adjust the range as needed
            foreach (Range cell in monitoredRange)
            {
                string currentValue = cell.Value?.ToString() ?? "";
                string cellAddress = cell.Address;

                if (previousValues.TryGetValue(cellAddress, out string previousValue))
                {
                    if (currentValue != previousValue)
                    {
                        SendToTcpServer(cellAddress, currentValue);
                        previousValues[cellAddress] = currentValue;
                    }
                }
                else
                {
                    // New value
                    SendToTcpServer(cellAddress, currentValue);
                    previousValues[cellAddress] = currentValue;
                }
            }
        }

        private void Application_SheetChange(object Sh, Range Target)
        {
            Worksheet worksheet = Sh as Worksheet;
            if (worksheet == null) return;

            Range monitoredRange = worksheet.Range["A1:Z30"]; // Adjust the range as needed
            Range changedCells = Globals.ThisAddIn.Application.Intersect(Target, monitoredRange);

            if (changedCells != null)
            {
                foreach (Range cell in changedCells)
                {
                    string currentValue = cell.Value?.ToString() ?? "";
                    SendToTcpServer(cell.Address, currentValue);
                }
            }
        }

        #region VSTO generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InternalStartup()
        {
            this.Startup += new System.EventHandler(ThisAddIn_Startup);
            this.Shutdown += new System.EventHandler(ThisAddIn_Shutdown);
        }

        #endregion
    }
}
