package com.railway.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.railway.entity.*;
import com.railway.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.Charset;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * 数据导入服务 - 支持完整CSV字段映射
 */
@Service
public class DataImportService {
    
    @Autowired
    private TrainMapper trainMapper;
    
    @Autowired
    private StationMapper stationMapper;
    
    @Autowired
    private PassengerFlowMapper flowMapper;
    
    @Autowired
    private LineStationMapper lineStationMapper;
    
    public Map<String, Object> importCSV(MultipartFile file, String dataType, boolean cleanData, boolean validate) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int successCount = 0;
        int totalCount = 0;
        
        try {
            Reader reader = new InputStreamReader(file.getInputStream(), Charset.forName("GBK"));
            CSVReader csvReader = new CSVReaderBuilder(reader).build();
            
            List<String[]> rows = csvReader.readAll();
            if (rows.isEmpty()) {
                result.put("success", false);
                result.put("message", "文件为空");
                return result;
            }
            
            String[] headers = rows.get(0);
            System.out.println("CSV表头: " + Arrays.toString(headers));
            totalCount = rows.size() - 2;
            
            switch (dataType) {
                case "trains":
                    successCount = importTrains(rows, headers, cleanData, validate, errors);
                    break;
                case "stations":
                    successCount = importStations(rows, headers, cleanData, validate, errors);
                    break;
                case "lines":
                    successCount = importLines(rows, headers, cleanData, validate, errors);
                    break;
                case "passengers":
                    successCount = importPassengerFlow(rows, headers, cleanData, validate, errors);
                    break;
                default:
                    result.put("success", false);
                    result.put("message", "未知数据类型");
                    return result;
            }
            
            csvReader.close();
            
        } catch (Exception e) {
            e.printStackTrace();
            result.put("success", false);
            result.put("message", "导入失败: " + e.getMessage());
            return result;
        }
        
        result.put("success", true);
        result.put("total", totalCount);
        result.put("success_count", successCount);
        result.put("error_count", errors.size());
        if (errors.size() <= 10) {
            result.put("errors", errors);
        } else {
            result.put("errors", errors.subList(0, 10));
            result.put("more_errors", errors.size() - 10);
        }
        return result;
    }
    
    /**
     * 导入列车数据
     * CSV列名: lcbm(列车编码), sxxbm(上下行编码), ysfsbm(运输方式编码), lcdm(列车代码), cc(车次), sfzt(状态), lcyn(列车运量)
     */
    private int importTrains(List<String[]> rows, String[] headers, boolean clean, boolean validate, List<String> errors) {
        int count = 0;
        Set<Integer> ids = new HashSet<>();
        
        // 从第2行开始（跳过表头和可能的说明行）
        int startRow = 1;
        // 检查第2行是否也是表头或说明
        if (rows.size() > 2) {
            String[] secondRow = rows.get(1);
            if (secondRow.length > 0 && (secondRow[0].contains("编码") || secondRow[0].contains("列车"))) {
                startRow = 2;
            }
        }
        
        for (int i = startRow; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length == 0 || isEmptyRow(row)) continue;
            
            try {
                Train train = new Train();
                
                // lcbm - 列车编码作为ID
                train.setId(parseInteger(getValueAny(row, headers, "lcbm", "列车编码", "id")));
                
                // lcdm或cc - 列车代码/车次
                String trainCode = getValueAny(row, headers, "lcdm", "cc", "列车代码", "车次", "trainCode");
                train.setTrainCode(trainCode);
                
                // 列车类型（从车次首字母判断，如Z95->Z, K351->K）
                if (trainCode != null && !trainCode.isEmpty()) {
                    char first = trainCode.charAt(0);
                    if (Character.isLetter(first)) {
                        train.setTrainType(String.valueOf(first).toUpperCase());
                    } else {
                        train.setTrainType("普通");
                    }
                }
                
                // lcyn - 列车运量
                train.setCapacity(parseInteger(getValueAny(row, headers, "lcyn", "列车运量", "capacity")));
                
                // sfzt - 状态
                Integer status = parseInteger(getValueAny(row, headers, "sfzt", "状态", "status"));
                train.setStatus(status != null ? status : 1);
                
                if (clean) {
                    if (train.getTrainCode() != null) train.setTrainCode(train.getTrainCode().trim());
                    if (train.getCapacity() == null || train.getCapacity() < 0) train.setCapacity(0);
                }
                
                if (validate) {
                    if (train.getId() == null) continue;
                    if (ids.contains(train.getId())) continue;
                    ids.add(train.getId());
                }
                
                trainMapper.insert(train);
                count++;
            } catch (Exception e) {
                if (errors.size() < 100) errors.add("第" + (i+1) + "行: " + e.getMessage());
            }
        }
        return count;
    }
    
    /**
     * 导入站点数据
     * CSV列名: zdid(站点id), lxid(线路id), ysfsbm(运输方式编码), zdmc(站点名称), sfty(是否停运), 
     *          station_code, station_telecode(电报码), station_shortname(简称)
     */
    private int importStations(List<String[]> rows, String[] headers, boolean clean, boolean validate, List<String> errors) {
        int count = 0;
        Set<Integer> ids = new HashSet<>();
        
        // 从第2行开始（跳过表头和可能的说明行）
        int startRow = 1;
        if (rows.size() > 2) {
            String[] secondRow = rows.get(1);
            if (secondRow.length > 0 && (secondRow[0].contains("站点") || secondRow[0].contains("id"))) {
                startRow = 2;
            }
        }
        
        for (int i = startRow; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length == 0 || isEmptyRow(row)) continue;
            
            try {
                Station station = new Station();
                
                // zdid - 站点ID
                station.setId(parseInteger(getValueAny(row, headers, "zdid", "站点id", "id")));
                
                // zdmc - 站点名称
                String stationName = getValueAny(row, headers, "zdmc", "站点名称", "stationName");
                station.setStationName(stationName);
                
                // station_code 或 station_telecode - 站点编码
                String stationCode = getValueAny(row, headers, "station_code", "station_telecode", "站点编码", "电报码", "stationCode");
                station.setStationCode(stationCode);
                
                if (clean && station.getStationName() != null) {
                    station.setStationName(station.getStationName().trim());
                }
                
                // 判断站点类型
                String name = station.getStationName();
                if (name != null) {
                    if (name.contains("东") || name.contains("西") || name.contains("南") || name.contains("北")) {
                        if (name.contains("成都") || name.contains("重庆") || name.contains("北京") || name.contains("上海") || name.contains("广州")) {
                            station.setStationType("枢纽站");
                        } else {
                            station.setStationType("中间站");
                        }
                    } else if (name.equals("成都") || name.equals("重庆") || name.equals("北京") || name.equals("上海")) {
                        station.setStationType("枢纽站");
                    } else {
                        station.setStationType("中间站");
                    }
                }
                
                if (validate) {
                    if (station.getId() == null) continue;
                    if (station.getStationName() == null || station.getStationName().isEmpty()) continue;
                    if (ids.contains(station.getId())) continue;
                    ids.add(station.getId());
                }
                
                stationMapper.insert(station);
                count++;
            } catch (Exception e) {
                if (errors.size() < 100) errors.add("第" + (i+1) + "行: " + e.getMessage());
            }
        }
        return count;
    }

    /**
     * 导入线路站点数据
     * CSV列名: yyxlbm(运营线路编码), zdid(站点id), xlzdid(线路站点id), Q_zdid(上一站id), 
     *          yqzdjjl(与前站距离), H_zdid(下一站id), sfqszd(是否起始站点), sfzdzd(是否终点站点), 
     *          ysjl(运输距离), xldm(线路代码), sfytk(是否要停靠)
     */
    private int importLines(List<String[]> rows, String[] headers, boolean clean, boolean validate, List<String> errors) {
        int count = 0;
        
        // 从第2行开始（跳过表头和可能的说明行）
        int startRow = 1;
        if (rows.size() > 2) {
            String[] secondRow = rows.get(1);
            if (secondRow.length > 0 && (secondRow[0].contains("线路") || secondRow[0].contains("编码"))) {
                startRow = 2;
            }
        }
        
        for (int i = startRow; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length == 0 || isEmptyRow(row)) continue;
            
            try {
                LineStation ls = new LineStation();
                
                // yyxlbm - 运营线路编码
                ls.setLineId(parseInteger(getValueAny(row, headers, "yyxlbm", "运营线路编码", "lineId")));
                // zdid - 站点ID
                ls.setStationId(parseInteger(getValueAny(row, headers, "zdid", "站点id", "stationId")));
                // xlzdid - 线路站点ID
                ls.setLineStationId(parseInteger(getValueAny(row, headers, "xlzdid", "线路站点id", "lineStationId")));
                // Q_zdid - 上一站ID（前站）
                ls.setPrevStationId(parseInteger(getValueAny(row, headers, "Q_zdid", "上一站id", "prevStationId")));
                // H_zdid - 下一站ID（后站）
                ls.setNextStationId(parseInteger(getValueAny(row, headers, "H_zdid", "下一站id", "nextStationId")));
                // yqzdjjl - 与前站距离（站间距离）
                ls.setDistance(parseDouble(getValueAny(row, headers, "yqzdjjl", "站间距离", "与前站距离", "distance")));
                // ysjl - 运输距离（总距离）
                ls.setTotalDistance(parseDouble(getValueAny(row, headers, "ysjl", "运输距离", "totalDistance")));
                // xldm - 线路代码
                ls.setLineCode(getValueAny(row, headers, "xldm", "线路代码", "lineCode"));
                // sfytk - 是否要停靠
                ls.setIsStop(parseInteger(getValueAny(row, headers, "sfytk", "是否要停靠", "是否停靠", "isStop")));
                
                if (validate && ls.getLineId() == null) continue;
                
                lineStationMapper.insert(ls);
                count++;
            } catch (Exception e) {
                if (errors.size() < 100) errors.add("第" + (i+1) + "行: " + e.getMessage());
            }
        }
        return count;
    }
    
    /**
     * 导入客运量数据 - 完整字段映射
     * CSV字段: xh, yyxlbm, lcbm, zdid, xlzdid, sxxbm, yxrq, yxsj, yqdzjjl, sfqszd, sfzdzd, 
     *          ddsj, cfsj, jtsj, kll, sxkll, xxkll, skl, xkl, bz, lccfrq, lccfsj, zdxh,
     *          ticket_type, ticket_price, seat_type_code, train_coporation_code, ksrq,
     *          start_station_telecode, start_station_name, end_station_telecode, end_station_name,
     *          train_class_code, train_type_code, sale_station_telecode, limit_station_telecode,
     *          spsj, to_station_telecode, shouru
     */
    private int importPassengerFlow(List<String[]> rows, String[] headers, boolean clean, boolean validate, List<String> errors) {
        int count = 0;
        
        System.out.println("开始导入客运量数据，表头: " + Arrays.toString(headers));
        
        for (int i = 2; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length == 0 || isEmptyRow(row)) continue;
            
            try {
                PassengerFlow flow = new PassengerFlow();
                
                // ========== 基础信息 ==========
                // xh - 序号
                flow.setSequenceNo(parseInteger(getValueAny(row, headers, "xh", "序号")));
                // yyxlbm - 运营线路编码
                flow.setLineId(parseInteger(getValueAny(row, headers, "yyxlbm", "运营线路编码")));
                // lcbm - 列车编码
                flow.setTrainId(parseInteger(getValueAny(row, headers, "lcbm", "列车编码")));
                // zdid - 站点id
                flow.setStationId(parseInteger(getValueAny(row, headers, "zdid", "站点id")));
                // xlzdid - 线路站点id
                flow.setSkzld(parseInteger(getValueAny(row, headers, "xlzdid", "线路站点id")));
                // sxxbm - 上下行编码
                flow.setSxbm(parseInteger(getValueAny(row, headers, "sxxbm", "上下行编码")));
                
                // ========== 日期时间 ==========
                // yxrq - 运行日期 (格式20150101)
                String dateStr = getValueAny(row, headers, "yxrq", "运行日期");
                if (dateStr != null && !dateStr.isEmpty() && !dateStr.equals("NULL")) {
                    Date parsedDate = parseDate(dateStr);
                    if (parsedDate != null) {
                        flow.setFlowDate(parsedDate);
                    }
                }
                // yxsj - 运行时间 (格式749表示7:49)
                flow.setOperateTime(parseTime(getValueAny(row, headers, "yxsj", "运行时间")));
                // yqdzjjl - 与起点站距离
                flow.setTimeInterval(getValueAny(row, headers, "yqdzjjl", "与起点站距离"));
                // sfqszd - 是否起始站点
                flow.setStartStationTime(getValueAny(row, headers, "sfqszd", "是否起始站点"));
                // sfzdzd - 是否终点站点
                flow.setStartStationDepart(getValueAny(row, headers, "sfzdzd", "是否终点站点"));
                // ddsj - 到达时间 (格式749)
                flow.setArriveTime(parseTime(getValueAny(row, headers, "ddsj", "到达时间")));
                // cfsj - 出发时间 (格式749)
                flow.setDepartTime(parseTime(getValueAny(row, headers, "cfsj", "出发时间")));
                // jtsj - 间隔时间
                // 存到remark或其他字段
                String jtsj = getValueAny(row, headers, "jtsj", "间隔时间");
                
                // ========== 客流量 ==========
                // kll - 客流量
                Integer kll = parseInteger(getValueAny(row, headers, "kll", "客流量"));
                // sxkll - 上行客流量
                Integer sxkll = parseInteger(getValueAny(row, headers, "sxkll", "上行客流量"));
                // xxkll - 下行客流量
                Integer xxkll = parseInteger(getValueAny(row, headers, "xxkll", "下行客流量"));
                // skl - 上客量
                flow.setBoarding(parseInteger(getValueAny(row, headers, "skl", "上客量")));
                // xkl - 下客量
                flow.setAlighting(parseInteger(getValueAny(row, headers, "xkl", "下客量")));
                
                // 如果skl为空但kll有值，用kll作为boarding
                if ((flow.getBoarding() == null || flow.getBoarding() == 0) && kll != null && kll > 0) {
                    flow.setBoarding(kll);
                }
                
                // bz - 备注
                flow.setRemark(getValueAny(row, headers, "bz", "备注"));
                // lccfrq - 列车出发日期
                flow.setTrainDepartDate(getValueAny(row, headers, "lccfrq", "列车出发日期"));
                // lccfsj - 列车出发时间
                flow.setTrainDepartTime(parseTime(getValueAny(row, headers, "lccfsj", "列车出发时间")));
                // zdxh - 站点序号 (如果xh没有值，用zdxh)
                if (flow.getSequenceNo() == null) {
                    flow.setSequenceNo(parseInteger(getValueAny(row, headers, "zdxh", "站点序号")));
                }
                
                // ========== 票务信息 ==========
                // ticket_type - 车票类型
                flow.setTicketType(getValueAny(row, headers, "ticket_type", "车票类型"));
                // ticket_price - 票价
                flow.setTicketPrice(parseDouble(getValueAny(row, headers, "ticket_price", "票价")));
                // seat_type_code - 座位类型编码 (W/O/M)
                flow.setSeatType(getValueAny(row, headers, "seat_type_code", "座位类型编码"));
                // train_coporation_code - 列车编组码
                flow.setTrainCopo(getValueAny(row, headers, "train_coporation_code", "列车编组码"));
                // ksrq - 开始日期/购票日期
                flow.setTicketDate(getValueAny(row, headers, "ksrq", "开始日期"));
                
                // ========== 起终点站信息 ==========
                // start_station_telecode - 起点站电报码 (如CDW)
                flow.setOriginStationStart(getValueAny(row, headers, "start_station_telecode", "起点站电报码"));
                // start_station_name - 起点站名称 (如成都)
                flow.setOriginStationStatic(getValueAny(row, headers, "start_station_name", "起点站"));
                // end_station_telecode - 终到站电报码 (如CUW)
                flow.setDestStationEnd(getValueAny(row, headers, "end_station_telecode", "终到站电报码"));
                // end_station_name - 终到站名称 (如重庆北)
                flow.setDestStationStatic(getValueAny(row, headers, "end_station_name", "终到站"));
                
                // ========== 列车信息 ==========
                // train_class_code - 列车等级码 (如D)
                flow.setTrainClass(getValueAny(row, headers, "train_class_code", "列车等级码"));
                // train_type_code - 列车类型码 (如3)
                flow.setTrainType(getValueAny(row, headers, "train_type_code", "列车类型码"));
                
                // ========== 售票信息 ==========
                // sale_station_telecode - 售票站电报码 (如ICW)
                String saleStation = getValueAny(row, headers, "sale_station_telecode", "售票站");
                // limit_station_telecode - 最远到达站电报码 (如CUW)
                String limitStation = getValueAny(row, headers, "limit_station_telecode", "最远到达站");
                // spsj - 售票时间/日期 (如20150101)
                flow.setStaticSps(getValueAny(row, headers, "spsj", "售票时间"));
                // to_station_telecode - 到达站电报码 (如CUW)
                String toStation = getValueAny(row, headers, "to_station_telecode", "到达站");
                
                // ========== 收入 ==========
                // shouru - 收入
                flow.setRevenue(parseDouble(getValueAny(row, headers, "shouru", "收入")));
                
                // ========== 数据清洗 ==========
                if (clean) {
                    if (flow.getBoarding() == null) flow.setBoarding(0);
                    if (flow.getAlighting() == null) flow.setAlighting(0);
                }
                
                flowMapper.insert(flow);
                count++;
                
                if (count % 1000 == 0) {
                    System.out.println("已导入 " + count + " 条客运数据...");
                }
                
            } catch (Exception e) {
                if (errors.size() < 100) {
                    errors.add("第" + (i+1) + "行: " + e.getMessage());
                }
            }
        }
        
        System.out.println("客运量数据导入完成，共 " + count + " 条");
        return count;
    }

    
    // ==================== 工具方法 ====================
    
    private String getValue(String[] row, String[] headers, String columnName) {
        for (int i = 0; i < headers.length && i < row.length; i++) {
            if (headers[i] != null && headers[i].trim().equalsIgnoreCase(columnName)) {
                String val = row[i];
                if (val != null && !val.equals("NULL") && !val.equals("#N/A") && !val.trim().isEmpty()) {
                    return val.trim();
                }
            }
        }
        return null;
    }
    
    private String getValueAny(String[] row, String[] headers, String... columnNames) {
        for (String name : columnNames) {
            String value = getValue(row, headers, name);
            if (value != null && !value.isEmpty()) {
                return value;
            }
        }
        return null;
    }
    
    private boolean isEmptyRow(String[] row) {
        for (String cell : row) {
            if (cell != null && !cell.trim().isEmpty() && !cell.equals("NULL")) {
                return false;
            }
        }
        return true;
    }
    
    private Integer parseInteger(String value) {
        if (value == null || value.trim().isEmpty() || value.equals("NULL") || value.equals("#N/A")) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            try {
                return (int) Double.parseDouble(value.trim());
            } catch (NumberFormatException e2) {
                return null;
            }
        }
    }
    
    private Double parseDouble(String value) {
        if (value == null || value.trim().isEmpty() || value.equals("NULL") || value.equals("#N/A")) {
            return null;
        }
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    // ==================== 日期时间格式清洗 ====================
    
    /**
     * 解析多种日期格式，统一转换为Date对象
     * 支持格式：
     * - 20240101, 2024-01-01, 2024/01/01
     * - 2024年1月1日
     * - 01-01-2024, 01/01/2024
     * - Excel数字日期格式
     */
    private Date parseDate(String value) {
        if (value == null || value.trim().isEmpty() || value.equals("NULL") || value.equals("#N/A")) {
            return null;
        }
        
        value = value.trim();
        
        // 尝试多种日期格式
        String[] patterns = {
            "yyyyMMdd",           // 20240101
            "yyyy-MM-dd",         // 2024-01-01
            "yyyy/MM/dd",         // 2024/01/01
            "yyyy年MM月dd日",      // 2024年01月01日
            "yyyy年M月d日",        // 2024年1月1日
            "dd-MM-yyyy",         // 01-01-2024
            "dd/MM/yyyy",         // 01/01/2024
            "MM-dd-yyyy",         // 01-01-2024
            "MM/dd/yyyy",         // 01/01/2024
            "yyyy.MM.dd",         // 2024.01.01
            "yyyyMMddHHmmss",     // 20240101120000
            "yyyy-MM-dd HH:mm:ss" // 2024-01-01 12:00:00
        };
        
        for (String pattern : patterns) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(pattern);
                sdf.setLenient(false);
                return sdf.parse(value);
            } catch (Exception e) {
                // 继续尝试下一个格式
            }
        }
        
        // 尝试解析Excel数字日期格式（如44927表示2023-01-01）
        try {
            double excelDate = Double.parseDouble(value);
            if (excelDate > 25569 && excelDate < 100000) {
                // Excel日期从1900-01-01开始，但有个bug，认为1900年是闰年
                long days = (long) excelDate - 25569; // 25569是1970-01-01的Excel日期值
                return new Date(days * 24 * 60 * 60 * 1000);
            }
        } catch (Exception e) {
            // 不是数字格式
        }
        
        // 尝试只提取数字部分
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() >= 8) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd");
                return sdf.parse(digits.substring(0, 8));
            } catch (Exception e) {
                // 解析失败
            }
        }
        
        return null;
    }
    
    /**
     * 解析多种时间格式，统一转换为标准时间字符串 HH:mm:ss
     * 支持格式：
     * - 12:30, 12:30:00
     * - 1230, 123000
     * - 749 (表示7:49), 948 (表示9:48) - 3位数格式
     * - 12时30分, 12点30分
     */
    private String parseTime(String value) {
        if (value == null || value.trim().isEmpty() || value.equals("NULL") || value.equals("#N/A")) {
            return null;
        }
        
        value = value.trim();
        
        // 已经是标准格式 HH:mm:ss
        if (value.matches("\\d{2}:\\d{2}:\\d{2}")) {
            return value;
        }
        
        // HH:mm 格式
        if (value.matches("\\d{1,2}:\\d{2}")) {
            String[] parts = value.split(":");
            return String.format("%02d:%02d:00", Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
        }
        
        // 3位数格式：749 表示 7:49，948 表示 9:48
        if (value.matches("\\d{3}")) {
            int hour = Integer.parseInt(value.substring(0, 1));
            int minute = Integer.parseInt(value.substring(1, 3));
            if (hour >= 0 && hour <= 9 && minute >= 0 && minute <= 59) {
                return String.format("%02d:%02d:00", hour, minute);
            }
        }
        
        // 4位数格式：1230 表示 12:30
        if (value.matches("\\d{4}")) {
            int hour = Integer.parseInt(value.substring(0, 2));
            int minute = Integer.parseInt(value.substring(2, 4));
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                return String.format("%02d:%02d:00", hour, minute);
            }
        }
        
        // 6位数格式：123000 表示 12:30:00
        if (value.matches("\\d{6}")) {
            return String.format("%s:%s:%s", value.substring(0, 2), value.substring(2, 4), value.substring(4, 6));
        }
        
        // 中文格式：12时30分 或 12点30分
        if (value.contains("时") || value.contains("点")) {
            String digits = value.replaceAll("[^0-9]", "");
            if (digits.length() >= 4) {
                int hour = Integer.parseInt(digits.substring(0, 2));
                int minute = Integer.parseInt(digits.substring(2, 4));
                int second = digits.length() >= 6 ? Integer.parseInt(digits.substring(4, 6)) : 0;
                return String.format("%02d:%02d:%02d", hour, minute, second);
            }
        }
        
        // 尝试提取数字并智能解析
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() == 3) {
            // 3位数：Hmm 格式
            int hour = Integer.parseInt(digits.substring(0, 1));
            int minute = Integer.parseInt(digits.substring(1, 3));
            if (hour >= 0 && hour <= 9 && minute >= 0 && minute <= 59) {
                return String.format("%02d:%02d:00", hour, minute);
            }
        } else if (digits.length() >= 4) {
            // 4位数：HHmm 格式
            int hour = Integer.parseInt(digits.substring(0, 2));
            int minute = Integer.parseInt(digits.substring(2, 4));
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                return String.format("%02d:%02d:00", hour, minute);
            }
        }
        
        return value; // 返回原值
    }
    
    /**
     * 格式化日期为统一格式 yyyy-MM-dd
     */
    private String formatDateString(String value) {
        Date date = parseDate(value);
        if (date != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
            return sdf.format(date);
        }
        return value;
    }
}
